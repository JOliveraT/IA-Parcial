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
  constructor(world, x, y, chromosome) {
    this.world = world;
    this.params = decodeChromosome(chromosome);
    this.startX = x;
    this.time = 0;
    this.controlEffort = 0;
    this.createBody(x, y);
  }

  createBody(x, y) {
    const baseOpt = { friction: 1.15, frictionStatic: 2.2, restitution: 0, density: 0.002 };

    this.torso = Bodies.rectangle(x, y, 78, 20, {
      ...baseOpt,
      density: 0.0027,
      chamfer: { radius: 5 },
      render: { fillStyle: '#ee6c4d' },
    });

    this.leftThigh = Bodies.rectangle(x - 20, y + 28, 12, 50, {
      ...baseOpt,
      render: { fillStyle: '#3d5a80' },
    });
    this.rightThigh = Bodies.rectangle(x + 20, y + 28, 12, 50, {
      ...baseOpt,
      render: { fillStyle: '#3d5a80' },
    });

    this.leftCalf = Bodies.rectangle(x - 20, y + 74, 10, 50, {
      ...baseOpt,
      density: 0.0023,
      render: { fillStyle: '#98c1d9' },
    });
    this.rightCalf = Bodies.rectangle(x + 20, y + 74, 10, 50, {
      ...baseOpt,
      density: 0.0023,
      render: { fillStyle: '#98c1d9' },
    });

    this.constraints = [
      Constraint.create({ bodyA: this.torso, pointA: { x: -20, y: 8 }, bodyB: this.leftThigh, pointB: { x: 0, y: -24 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.torso, pointA: { x: 20, y: 8 }, bodyB: this.rightThigh, pointB: { x: 0, y: -24 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.leftThigh, pointA: { x: 0, y: 24 }, bodyB: this.leftCalf, pointB: { x: 0, y: -24 }, stiffness: 0.98, length: 0, render: { visible: false } }),
      Constraint.create({ bodyA: this.rightThigh, pointA: { x: 0, y: 24 }, bodyB: this.rightCalf, pointB: { x: 0, y: -24 }, stiffness: 0.98, length: 0, render: { visible: false } }),
    ];

    this.parts = [this.torso, this.leftThigh, this.rightThigh, this.leftCalf, this.rightCalf];
    Composite.add(this.world, [...this.parts, ...this.constraints]);
  }

  update(dtMs) {
    const dt = dtMs / 1000;
    this.time += dt;

    const p = this.params;
    const phase = this.time * p.stepFrequency;

    const leftHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase);
    const rightHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase + p.phaseOffset);

    const leftKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase));
    const rightKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase + p.phaseOffset));

    this.applyJointControl(this.leftThigh, this.torso, leftHipTarget, HIP_MIN, HIP_MAX, p.motorStrength * 8.5);
    this.applyJointControl(this.rightThigh, this.torso, rightHipTarget, HIP_MIN, HIP_MAX, p.motorStrength * 8.5);
    this.applyJointControl(this.leftCalf, this.leftThigh, leftKneeTarget, KNEE_MIN, KNEE_MAX, p.motorStrength * 7.6);
    this.applyJointControl(this.rightCalf, this.rightThigh, rightKneeTarget, KNEE_MIN, KNEE_MAX, p.motorStrength * 7.6);

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
}
