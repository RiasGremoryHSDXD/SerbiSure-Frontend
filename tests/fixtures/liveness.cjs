function faceFrame(yawAngle, timestamp, eyes = 'open') {
  const probability = eyes === 'closed' ? 0.1 : 0.9;
  return { frameWidth: 100, frameHeight: 100, timestamp,
    face: { bounds: { x: 30, y: 30, width: 40, height: 40 }, points: [], timestamp,
      signals: { yawAngle, leftEyeOpenProbability: probability, rightEyeOpenProbability: probability } } };
}

function successfulFrames() {
  const frames = [];
  for (let time = 0; time <= 3100; time += 100) {
    const yaw = time >= 100 && time <= 1000 ? -15 : time >= 1100 && time <= 2000 ? 15 : 0;
    frames.push(faceFrame(yaw, time));
  }
  return frames;
}

module.exports = { faceFrame, successfulFrames };
