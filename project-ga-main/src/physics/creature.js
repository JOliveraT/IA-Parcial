import Matter from 'matter-js';
import { decodeChromosome } from '../ia/chromosome';

const { Bodies, Constraint, Composite, Body } = Matter;

const deg = (v) => (v * Math.PI) / 180;
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

const HIP_MIN = deg(-40);
const HIP_MAX = deg(40);
const KNEE_MIN = deg(0);
const KNEE_MAX = deg(100);

export class Creature {
  constructor(world, chromosome, config = {}) {
    this.world = world;
    this.params = decodeChromosome(chromosome);
    this.time = 0;
    this.controlEffort = 0;

    const defaults = {
      startX: 120,
      groundY: 620,
      bodyWidth: 78,
      bodyHeight: 20,
      femurLength: 50,
      tibiaLength: 50,
      femurWidth: 12,
      tibiaWidth: 10,
      hipInset: 20,
      hipDrop: 8,
      legGap: 6,
    };
    this.dimensions = { ...defaults, ...config };
    this.startX = this.dimensions.startX;
    this.createBody();
  }

  createBody() {
    const baseOpt = { friction: 1.15, frictionStatic: 2.2, restitution: 0, density: 0.002 };

    const d = this.dimensions;
    const hipY = d.groundY - d.tibiaLength - d.femurLength;
    const torsoY = hipY - d.hipDrop + d.bodyHeight / 2;
    const thighY = hipY + d.femurLength / 2;
    const calfY = d.groundY - d.tibiaLength / 2;
    const leftLegX = d.startX - (d.legGap / 2 + d.femurWidth / 2);
    const rightLegX = d.startX + (d.legGap / 2 + d.femurWidth / 2);

    this.torso = Bodies.rectangle(d.startX, torsoY, d.bodyWidth, d.bodyHeight, {
      ...baseOpt,
      density: 0.0027,
      chamfer: { radius: 5 },
      render: { fillStyle: '#ee6c4d' },
    });

    this.leftThigh = Bodies.rectangle(leftLegX, thighY, d.femurWidth, d.femurLength, {
      ...baseOpt,
      render: { fillStyle: '#3d5a80' },
    });
    this.rightThigh = Bodies.rectangle(rightLegX, thighY, d.femurWidth, d.femurLength, {
      ...baseOpt,
      render: { fillStyle: '#3d5a80' },
    });

    this.leftCalf = Bodies.rectangle(leftLegX, calfY, d.tibiaWidth, d.tibiaLength, {
      ...baseOpt,
      density: 0.0023,
      render: { fillStyle: '#98c1d9' },
    });
    this.rightCalf = Bodies.rectangle(rightLegX, calfY, d.tibiaWidth, d.tibiaLength, {
      ...baseOpt,
      density: 0.0023,
      render: { fillStyle: '#98c1d9' },
    });

    this.constraints = [
      Constraint.create({ bodyA: this.torso, pointA: { x: -d.hipInset, y: d.hipDrop }, bodyB: this.leftThigh, pointB: { x: 0, y: -d.femurLength / 2 + 1 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.torso, pointA: { x: d.hipInset, y: d.hipDrop }, bodyB: this.rightThigh, pointB: { x: 0, y: -d.femurLength / 2 + 1 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.leftThigh, pointA: { x: 0, y: d.femurLength / 2 - 1 }, bodyB: this.leftCalf, pointB: { x: 0, y: -d.tibiaLength / 2 + 1 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.rightThigh, pointA: { x: 0, y: d.femurLength / 2 - 1 }, bodyB: this.rightCalf, pointB: { x: 0, y: -d.tibiaLength / 2 + 1 }, stiffness: 0.98, length: 0, render: { visible: false } }),
    ];

    this.parts = [this.torso, this.leftThigh, this.rightThigh, this.leftCalf, this.rightCalf];
    Composite.add(this.world, [...this.parts, ...this.constraints]);
  }

  update(dtMs) {
    const dt = dtMs / 1000;
    this.time += dt;

    const p = this.params;
    const phase = this.time * p.stepFrequency;

    const warmup = clamp(this.time / 0.35, 0, 1);

    const leftHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase);
    const rightHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase + p.phaseOffset);

    const leftKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase));
    const rightKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase + p.phaseOffset));

    this.applyJointControl(this.leftThigh, this.torso, leftHipTarget, HIP_MIN, HIP_MAX, p.motorStrength * 8.5 * warmup);
    this.applyJointControl(this.rightThigh, this.torso, rightHipTarget, HIP_MIN, HIP_MAX, p.motorStrength * 8.5 * warmup);
    this.applyJointControl(this.leftCalf, this.leftThigh, leftKneeTarget, KNEE_MIN, KNEE_MAX, p.motorStrength * 7.6 * warmup);
    this.applyJointControl(this.rightCalf, this.rightThigh, rightKneeTarget, KNEE_MIN, KNEE_MAX, p.motorStrength * 7.6 * warmup);

    const torsoErr = -this.torso.angle;
    const torsoDelta = clamp(torsoErr * p.bodyStability, -0.03, 0.03);
    Body.setAngularVelocity(this.torso, clamp(this.torso.angularVelocity + torsoDelta, -1.8, 1.8));
  }

  applyJointControl(part, base, target, minA, maxA, gain) {
    const rel = part.angle - base.angle;
    const clampedTarget = clamp(target, minA, maxA);
    const err = clampedTarget - rel;

    const delta = clamp(err * gain, -0.06, 0.06);
    Body.setAngularVelocity(part, clamp(part.angularVelocity + delta, -3.2, 3.2));

    if (rel < minA || rel > maxA) {
      const bounded = clamp(rel, minA, maxA);
      const correction = clamp((bounded - rel) * 0.35, -0.08, 0.08);
      Body.setAngularVelocity(part, clamp(part.angularVelocity + correction, -3.2, 3.2));
    }

    this.controlEffort += Math.abs(delta);
  }

  get body() {
    return this.torso;
  }

  isTorsoTouchingGround(groundY, tolerance = 2) {
    const halfHeight = this.torso.bounds.max.y - this.torso.position.y;
    return this.torso.position.y + halfHeight >= groundY - tolerance;
  }
}
