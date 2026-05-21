import Matter from 'matter-js';
import { decodeChromosome } from '../ia/chromosome';

const { Bodies, Constraint, Composite, Body } = Matter;
const deg = (v) => (v * Math.PI) / 180;
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

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
    const opt = { friction: 1, frictionStatic: 2, restitution: 0, density: 0.002 };
    this.torso = Bodies.rectangle(x, y, 35, 60, { ...opt, render: { fillStyle: '#ee6c4d' } });
    this.head = Bodies.circle(x, y - 42, 12, { density: 0.001, render: { fillStyle: '#f4d6cc' } });

    this.leftThigh = Bodies.rectangle(x - 12, y + 50, 12, 45, { ...opt, render: { fillStyle: '#3d5a80' } });
    this.rightThigh = Bodies.rectangle(x + 12, y + 50, 12, 45, { ...opt, render: { fillStyle: '#3d5a80' } });
    this.leftCalf = Bodies.rectangle(x - 12, y + 95, 10, 45, { ...opt, render: { fillStyle: '#98c1d9' } });
    this.rightCalf = Bodies.rectangle(x + 12, y + 95, 10, 45, { ...opt, render: { fillStyle: '#98c1d9' } });
    this.leftFoot = Bodies.rectangle(x - 12, y + 125, 28, 8, { ...opt, density: 0.003, render: { fillStyle: '#293241' } });
    this.rightFoot = Bodies.rectangle(x + 12, y + 125, 28, 8, { ...opt, density: 0.003, render: { fillStyle: '#293241' } });

    this.constraints = [
      Constraint.create({ bodyA: this.torso, pointA: { x: 0, y: -30 }, bodyB: this.head, pointB: { x: 0, y: 12 }, stiffness: 0.9 }),
      Constraint.create({ bodyA: this.torso, pointA: { x: -10, y: 24 }, bodyB: this.leftThigh, pointB: { x: 0, y: -22 }, stiffness: 0.95 }),
      Constraint.create({ bodyA: this.torso, pointA: { x: 10, y: 24 }, bodyB: this.rightThigh, pointB: { x: 0, y: -22 }, stiffness: 0.95 }),
      Constraint.create({ bodyA: this.leftThigh, pointA: { x: 0, y: 22 }, bodyB: this.leftCalf, pointB: { x: 0, y: -22 }, stiffness: 0.95 }),
      Constraint.create({ bodyA: this.rightThigh, pointA: { x: 0, y: 22 }, bodyB: this.rightCalf, pointB: { x: 0, y: -22 }, stiffness: 0.95 }),
      Constraint.create({ bodyA: this.leftCalf, pointA: { x: 0, y: 22 }, bodyB: this.leftFoot, pointB: { x: -8, y: -2 }, stiffness: 0.95 }),
      Constraint.create({ bodyA: this.rightCalf, pointA: { x: 0, y: 22 }, bodyB: this.rightFoot, pointB: { x: -8, y: -2 }, stiffness: 0.95 }),
    ];

    this.parts = [this.torso, this.head, this.leftThigh, this.rightThigh, this.leftCalf, this.rightCalf, this.leftFoot, this.rightFoot];
    Composite.add(this.world, [...this.parts, ...this.constraints]);
  }

  update(dtMs) {
    const dt = dtMs / 1000;
    this.time += dt;
    const p = this.params;
    const phase = this.time * p.stepFrequency;
    const kneePhase = Math.PI * 0.45;

    const lHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase);
    const rHipTarget = p.hipBias + p.hipAmplitude * Math.sin(phase + p.phaseOffset);
    const lKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase + kneePhase));
    const rKneeTarget = p.kneeBias + p.kneeAmplitude * Math.max(0, Math.sin(phase + p.phaseOffset + kneePhase));

    this.applyJointControl(this.leftThigh, this.torso, lHipTarget, -deg(45), deg(45), p.motorStrength * 10);
    this.applyJointControl(this.rightThigh, this.torso, rHipTarget, -deg(45), deg(45), p.motorStrength * 10);
    this.applyJointControl(this.leftCalf, this.leftThigh, lKneeTarget, 0, deg(90), p.motorStrength * 9);
    this.applyJointControl(this.rightCalf, this.rightThigh, rKneeTarget, 0, deg(90), p.motorStrength * 9);
    this.applyJointControl(this.leftFoot, this.leftCalf, 0, -deg(25), deg(25), p.motorStrength * 7);
    this.applyJointControl(this.rightFoot, this.rightCalf, 0, -deg(25), deg(25), p.motorStrength * 7);

    const torsoErr = -this.torso.angle;
    Body.setAngularVelocity(this.torso, this.torso.angularVelocity + clamp(torsoErr * p.torsoStability, -0.04, 0.04));
  }

  applyJointControl(part, base, target, minA, maxA, gain) {
    const rel = part.angle - base.angle;
    const clamped = clamp(target, minA, maxA);
    const err = clamped - rel;
    const delta = clamp(err * gain, -0.05, 0.05);
    Body.setAngularVelocity(part, clamp(part.angularVelocity + delta, -2.5, 2.5));

    if (rel < minA || rel > maxA) {
      const correction = clamp((clamp(rel, minA, maxA) - rel) * 0.3, -0.08, 0.08);
      Body.setAngularVelocity(part, part.angularVelocity + correction);
    }
    this.controlEffort += Math.abs(delta);
  }

  get body() {
    return this.torso;
  }
}
