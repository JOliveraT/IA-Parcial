import Matter from 'matter-js';
import { decodeChromosome } from '../ia/chromosome';

const { Bodies, Constraint, Composite, Body } = Matter;

const deg = (v) => (v * Math.PI) / 180;
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

const HIP_MIN = deg(-55);
const HIP_MAX = deg(55);
const KNEE_MIN = deg(0);
const KNEE_MAX = deg(120);
const BODY_MIN = deg(-24);
const BODY_MAX = deg(24);

export class Creature {
  constructor(world, chromosome, config = {}) {
    this.world = world;
    this.params = decodeChromosome(chromosome);
    this.time = 0;
    this.controlEffort = 0;

    const defaults = {
      startX: 120,
      groundTopY: 680,
      bodyWidth: 76,
      bodyHeight: 30,
      femurLength: 54,
      tibiaLength: 56,
      femurWidth: 14,
      tibiaWidth: 11,
      hipSpread: 7,
    };
    this.dimensions = { ...defaults, ...config };
    this.startX = this.dimensions.startX;
    this.createBody();
  }

  createBody() {
    const d = this.dimensions;
    const baseOpt = { friction: 1.1, frictionStatic: 2.4, restitution: 0, density: 0.002 };

    const lowerLegBottomY = d.groundTopY - 1;
    const hipY = lowerLegBottomY - d.tibiaLength - d.femurLength + 6;
    const bodyY = hipY - d.bodyHeight / 2;
    const upperCenterY = hipY + d.femurLength / 2;
    const kneeY = hipY + d.femurLength;
    const tibiaCenterY = kneeY + d.tibiaLength / 2;
    const leftX = d.startX - d.hipSpread;
    const rightX = d.startX + d.hipSpread;

    this.torso = Bodies.rectangle(d.startX, bodyY, d.bodyWidth, d.bodyHeight, {
      ...baseOpt,
      density: 0.0029,
      chamfer: { radius: 6 },
      render: { fillStyle: '#e76f51' },
    });

    const creatureGroup = Body.nextGroup(true);
    const legCollision = { group: creatureGroup, category: 0x0002, mask: 0xffff };

    this.leftThigh = Bodies.rectangle(leftX, upperCenterY, d.femurWidth, d.femurLength, { ...baseOpt, collisionFilter: legCollision, render: { fillStyle: '#355070' } });
    this.rightThigh = Bodies.rectangle(rightX, upperCenterY, d.femurWidth, d.femurLength, { ...baseOpt, collisionFilter: legCollision, render: { fillStyle: '#355070' } });
    this.leftCalf = Bodies.rectangle(leftX, tibiaCenterY, d.tibiaWidth, d.tibiaLength, { ...baseOpt, collisionFilter: legCollision, render: { fillStyle: '#8ecae6' } });
    this.rightCalf = Bodies.rectangle(rightX, tibiaCenterY, d.tibiaWidth, d.tibiaLength, { ...baseOpt, collisionFilter: legCollision, render: { fillStyle: '#8ecae6' } });

    this.constraints = [
      Constraint.create({ bodyA: this.torso, pointA: { x: -d.hipSpread, y: d.bodyHeight / 2 - 1 }, bodyB: this.leftThigh, pointB: { x: 0, y: -d.femurLength / 2 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.torso, pointA: { x: d.hipSpread, y: d.bodyHeight / 2 - 1 }, bodyB: this.rightThigh, pointB: { x: 0, y: -d.femurLength / 2 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.leftThigh, pointA: { x: 0, y: d.femurLength / 2 }, bodyB: this.leftCalf, pointB: { x: 0, y: -d.tibiaLength / 2 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.rightThigh, pointA: { x: 0, y: d.femurLength / 2 }, bodyB: this.rightCalf, pointB: { x: 0, y: -d.tibiaLength / 2 }, stiffness: 0.98, length: 0, render: { visible: false } }),
    ];

    Body.setAngle(this.torso, deg(-7));
    Body.setAngle(this.leftThigh, deg(-14));
    Body.setAngle(this.rightThigh, deg(14));
    Body.setAngle(this.leftCalf, deg(20));
    Body.setAngle(this.rightCalf, deg(20));

    this.parts = [this.torso, this.leftThigh, this.rightThigh, this.leftCalf, this.rightCalf];
    Composite.add(this.world, [...this.parts, ...this.constraints]);
  }

  update(dtMs) {
    const p = this.params;
    this.time += dtMs / 1000;
    const phase = this.time * p.stepFrequency;

    const leftHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase);
    const rightHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase + p.phaseOffset);

    const leftKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase + p.kneePhase));
    const rightKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase + p.phaseOffset + p.kneePhase));

    this.applyJointControl(this.leftThigh, this.torso, leftHipTarget, HIP_MIN, HIP_MAX, p.motorStrength * 9);
    this.applyJointControl(this.rightThigh, this.torso, rightHipTarget, HIP_MIN, HIP_MAX, p.motorStrength * 9);
    this.applyJointControl(this.leftCalf, this.leftThigh, leftKneeTarget, KNEE_MIN, KNEE_MAX, p.motorStrength * 7.8);
    this.applyJointControl(this.rightCalf, this.rightThigh, rightKneeTarget, KNEE_MIN, KNEE_MAX, p.motorStrength * 7.8);

    const bodyPitchTarget = p.bodyPitchBias + p.bodyPitchAmplitude * Math.sin(phase + 0.7);
    const bodyErr = clamp(bodyPitchTarget - this.torso.angle, BODY_MIN, BODY_MAX);
    const correction = clamp(bodyErr * p.bodyStability, -0.05, 0.05);
    Body.setAngularVelocity(this.torso, clamp(this.torso.angularVelocity + correction, -1.8, 1.8));
  }

  applyJointControl(part, base, target, minA, maxA, gain) {
    const rel = part.angle - base.angle;
    const boundedTarget = clamp(target, minA, maxA);
    const err = boundedTarget - rel;
    const delta = clamp(err * gain, -0.07, 0.07);
    Body.setAngularVelocity(part, clamp(part.angularVelocity + delta, -2.8, 2.8));
    this.controlEffort += Math.abs(delta);
  }

  get body() { return this.torso; }

  isTorsoTouchingGround(groundTopY, tolerance = 2) {
    const halfHeight = this.torso.bounds.max.y - this.torso.position.y;
    return this.torso.position.y + halfHeight >= groundTopY - tolerance;
  }
}
