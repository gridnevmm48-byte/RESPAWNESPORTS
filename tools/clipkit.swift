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

import AVFoundation
import CoreImage
import Foundation

let a = CommandLine.arguments
guard a.count == 8,
      let W = Int(a[3]), let H = Int(a[4]),
      let start = Double(a[5]), let dur = Double(a[6]), let kbps = Int(a[7])
else {
    FileHandle.standardError.write("usage: clipkit <in> <out.mp4> <w> <h> <start> <dur> <kbps>\n".data(using: .utf8)!)
    exit(2)
}
let FPS: Int32 = 30
let inURL = URL(fileURLWithPath: a[1])
let outURL = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: outURL)

func die(_ m: String) -> Never {
    FileHandle.standardError.write((m + "\n").data(using: .utf8)!)
    exit(1)
}

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

guard let reader = try? AVAssetReader(asset: asset) else { die("reader init failed") }
guard let writer = try? AVAssetWriter(outputURL: outURL, fileType: .mp4) else { die("writer init failed") }
reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600),
                               duration: CMTime(seconds: dur, preferredTimescale: 600))

let output = AVAssetReaderTrackOutput(
    track: track,
    outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false
reader.add(output)

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
guard reader.startReading() else { die("startReading: \(String(describing: reader.error))") }
writer.startSession(atSourceTime: .zero)

let ci = CIContext(options: [.useSoftwareRenderer: false])
var origin: CMTime? = nil
var frames = 0
let done = DispatchSemaphore(value: 0)

input.requestMediaDataWhenReady(on: DispatchQueue(label: "clipkit")) {
    while input.isReadyForMoreMediaData {
        guard let sb = output.copyNextSampleBuffer(),
              let src = CMSampleBufferGetImageBuffer(sb) else {
            input.markAsFinished()
            writer.finishWriting { done.signal() }
            return
        }
        let pts = CMSampleBufferGetPresentationTimeStamp(sb)
        if origin == nil { origin = pts }

        guard let pool = adaptor.pixelBufferPool else { continue }
        var dst: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &dst)
        guard let out = dst else { continue }

        let image = CIImage(cvPixelBuffer: src).transformed(by: xform)
        ci.render(image, to: out,
                  bounds: CGRect(origin: .zero, size: render),
                  colorSpace: CGColorSpaceCreateDeviceRGB())
        adaptor.append(out, withPresentationTime: CMTimeSubtract(pts, origin!))
        frames += 1
    }
}
done.wait()

if writer.status != .completed { die("write failed: \(String(describing: writer.error))") }
let bytes = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
print("\(outURL.lastPathComponent)  \(W)x\(H)  \(frames)f  \((bytes ?? 0) / 1024) KB")
