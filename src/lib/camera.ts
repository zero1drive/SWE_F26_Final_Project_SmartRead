// Browser webcam helpers for face enrolment and face login.

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use a camera.');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    await video.play();
    return stream;
  } catch {
    throw new Error('No camera found, or permission was denied. You can still log in with your password.');
  }
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** One frame as a base64 JPEG, cropped to the centre square where the face usually is. */
export function grabFrame(video: HTMLVideoElement, size = 224): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const side = Math.min(video.videoWidth, video.videoHeight) * 0.8;
  const sx = (video.videoWidth - side) / 2;
  const sy = (video.videoHeight - side) / 2;
  canvas.getContext('2d')!.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
