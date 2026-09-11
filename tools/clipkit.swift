// clipkit - trim, rotate, cover-scale and re-encode a clip for inlining.
//
// avconvert only exposes fixed presets, which put a five second card loop at
// 1.6 MB. This walks the frames through AVAssetReader/AVAssetWriter instead so
// bitrate, size and frame rate are ours, and drops audio entirely (every clip
// on the page is muted).
//
// Rotation and scaling go through CoreImage rather than an
// AVMutableVideoComposition: the reader rejects compositions it considers
// invalid (-11841) for reasons it will not name, and this path is explicit.
//
//   swiftc -O tools/clipkit.swift -o /tmp/clipkit
//   clipkit <in> <out.mp4> <w> <h> <start> <dur> <kbps>
//
// <start> and <dur> may be comma-separated lists of equal length: each pair is
// one segment of the same source, and the segments are spliced back to back
// into a single loop (a two-shot card is `13.4,7.6 2.5,2.0`). Frames the reader
// hands back from before a segment's start - the run-up from the previous
// keyframe - are dropped, so the cut lands where asked.

import AVFoundation
import CoreImage
import Foundation

let a = CommandLine.arguments
guard a.count == 8,
      let W = Int(a[3]), let H = Int(a[4]), let kbps = Int(a[7])
else {
    FileHandle.standardError.write("usage: clipkit <in> <out.mp4> <w> <h> <start[,start…]> <dur[,dur…]> <kbps>\n".data(using: .utf8)!)
    exit(2)
}
let starts = a[5].split(separator: ",").compactMap { Double($0) }
let durs = a[6].split(separator: ",").compactMap { Double($0) }
let FPS: Int32 = 30
let inURL = URL(fileURLWithPath: a[1])
let outURL = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: outURL)

func die(_ m: String) -> Never {
    FileHandle.standardError.write((m + "\n").data(using: .utf8)!)
    exit(1)
}
guard !starts.isEmpty, starts.count == durs.count else { die("start and dur lists must be the same length") }

let asset = AVURLAsset(url: inURL)
guard let track = asset.tracks(withMediaType: .video).first else { die("no video track") }

let render = CGSize(width: W, height: H)
let natural = track.naturalSize
let pt = track.preferredTransform

// Normalise rotation so the oriented frame sits at the origin, then cover-fill
// the render box and centre the overflow.
let box = CGRect(origin: .zero, size: natural).applying(pt)
let ow = abs(box.width), oh = abs(box.height)
let scale = max(render.width / ow, render.height / oh)
let xform = pt
    .concatenating(CGAffineTransform(translationX: -box.minX, y: -box.minY))
    .concatenating(CGAffineTransform(scaleX: scale, y: scale))
    .concatenating(CGAffineTransform(translationX: (render.width - ow * scale) / 2,
                                     y: (render.height - oh * scale) / 2))

// One reader per segment; the writer session is shared across all of them.
func segmentStart(_ i: Int) -> CMTime { CMTime(seconds: starts[i], preferredTimescale: 600) }
func makeReader(_ i: Int) -> (AVAssetReader, AVAssetReaderTrackOutput) {
    guard let r = try? AVAssetReader(asset: asset) else { die("reader init failed") }
    r.timeRange = CMTimeRange(start: segmentStart(i),
                              duration: CMTime(seconds: durs[i], preferredTimescale: 600))
    let o = AVAssetReaderTrackOutput(
        track: track,
        outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    o.alwaysCopiesSampleData = false
    r.add(o)
    guard r.startReading() else { die("startReading: \(String(describing: r.error))") }
    return (r, o)
}

guard let writer = try? AVAssetWriter(outputURL: outURL, fileType: .mp4) else { die("writer init failed") }
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W,
    AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: kbps * 1000,
        AVVideoMaxKeyFrameIntervalKey: Int(FPS) * 2,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264MainAutoLevel,
        AVVideoAllowFrameReorderingKey: true,
    ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: W,
        kCVPixelBufferHeightKey as String: H,
    ])
writer.add(input)

guard writer.startWriting() else { die("startWriting: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)

let ci = CIContext(options: [.useSoftwareRenderer: false])
let frameDur = CMTime(value: 1, timescale: FPS)
var seg = 0
var (reader, output) = makeReader(0)
var segOrigin: CMTime? = nil   // first kept source pts of the current segment
var base = CMTime.zero         // output time where the current segment begins
var lastOut = CMTime.zero
var frames = 0
let done = DispatchSemaphore(value: 0)

input.requestMediaDataWhenReady(on: DispatchQueue(label: "clipkit")) {
    while input.isReadyForMoreMediaData {
        var sample = output.copyNextSampleBuffer()
        while sample == nil {
            // segment drained: splice the next one on, or finish
            reader.cancelReading()
            seg += 1
            if seg >= starts.count {
                input.markAsFinished()
                writer.finishWriting { done.signal() }
                return
            }
            (reader, output) = makeReader(seg)
            segOrigin = nil
            base = frames == 0 ? .zero : CMTimeAdd(lastOut, frameDur)
            sample = output.copyNextSampleBuffer()
        }
        guard let sb = sample, let src = CMSampleBufferGetImageBuffer(sb) else { continue }
        let pts = CMSampleBufferGetPresentationTimeStamp(sb)
        if pts < segmentStart(seg) { continue }   // keyframe run-up, not asked for
        if segOrigin == nil { segOrigin = pts }

        guard let pool = adaptor.pixelBufferPool else { continue }
        var dst: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &dst)
        guard let out = dst else { continue }

        let image = CIImage(cvPixelBuffer: src).transformed(by: xform)
        ci.render(image, to: out,
                  bounds: CGRect(origin: .zero, size: render),
                  colorSpace: CGColorSpaceCreateDeviceRGB())
        let outPts = CMTimeAdd(base, CMTimeSubtract(pts, segOrigin!))
        adaptor.append(out, withPresentationTime: outPts)
        lastOut = outPts
        frames += 1
    }
}
done.wait()

if writer.status != .completed { die("write failed: \(String(describing: writer.error))") }
let bytes = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
let cuts = starts.count > 1 ? "  \(starts.count) segments" : ""
print("\(outURL.lastPathComponent)  \(W)x\(H)  \(frames)f  \((bytes ?? 0) / 1024) KB\(cuts)")
