export class Creature {
  constructor(config = {}) {
    this.cfg = {
      torsoW: 78,
      torsoH: 34,
      femur: 56,
      tibia: 58,
      hipSpread: 12,
      ...config,
    };
  }

  getPosePoints(state) {
    const { x, y, pose } = state;
    const { torsoW, torsoH, femur, tibia, hipSpread } = this.cfg;
    const bodyAngle = pose.bodyPitch;
    const cos = Math.cos(bodyAngle);
    const sin = Math.sin(bodyAngle);
    const rot = (px, py) => ({ x: x + px * cos - py * sin, y: y + px * sin + py * cos });

    const hipL = rot(-hipSpread, torsoH * 0.4);
    const hipR = rot(hipSpread, torsoH * 0.4);

    const makeLeg = (hip, hipAng, kneeAng) => {
      const thighAng = bodyAngle + Math.PI / 2 + hipAng;
      const knee = { x: hip.x + Math.cos(thighAng) * femur, y: hip.y + Math.sin(thighAng) * femur };
      const shinAng = thighAng + kneeAng;
      const foot = { x: knee.x + Math.cos(shinAng) * tibia, y: knee.y + Math.sin(shinAng) * tibia };
      return { knee, foot, thighAng, shinAng };
    };

    const left = makeLeg(hipL, pose.leftHip, pose.leftKnee);
    const right = makeLeg(hipR, pose.rightHip, pose.rightKnee);

    return {
      torso: [rot(-torsoW / 2, -torsoH / 2), rot(torsoW / 2, -torsoH / 2), rot(torsoW / 2, torsoH / 2), rot(-torsoW / 2, torsoH / 2)],
      hipL,
      hipR,
      left,
      right,
    };
  }
}
