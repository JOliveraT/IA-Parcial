import Matter from 'matter-js';
import { decodeChromosome } from '../ia/chromosome';

const { Bodies, Constraint, Composite, Body } = Matter;

export class Creature {
  constructor(world, x, y, chromosome) {
    this.world = world;
    this.chromosome = chromosome;
    this.params = decodeChromosome(chromosome);
    this.startX = x;
    this.time = 0;
    this.controlEffort = 0;

    this.createBody(x, y);
  }

  createBody(x, y) {
    this.body = Bodies.rectangle(x, y, 60, 20, { friction: 0.8, render: { fillStyle: '#ff7043' } });
    this.leg1 = Bodies.rectangle(x - 20, y + 40, 10, 50, { friction: 1, render: { fillStyle: '#42a5f5' } });
    this.leg2 = Bodies.rectangle(x + 20, y + 40, 10, 50, { friction: 1, render: { fillStyle: '#42a5f5' } });
    this.calf1 = Bodies.rectangle(x - 20, y + 90, 9, 45, { friction: 1, render: { fillStyle: '#26a69a' } });
    this.calf2 = Bodies.rectangle(x + 20, y + 90, 9, 45, { friction: 1, render: { fillStyle: '#26a69a' } });

    this.joint1 = Constraint.create({ bodyA: this.body, bodyB: this.leg1, pointA: { x: -20, y: 10 }, pointB: { x: 0, y: -25 }, stiffness: 0.9 });
    this.joint2 = Constraint.create({ bodyA: this.body, bodyB: this.leg2, pointA: { x: 20, y: 10 }, pointB: { x: 0, y: -25 }, stiffness: 0.9 });
    this.knee1 = Constraint.create({ bodyA: this.leg1, bodyB: this.calf1, pointA: { x: 0, y: 25 }, pointB: { x: 0, y: -22 }, stiffness: 0.8 });
    this.knee2 = Constraint.create({ bodyA: this.leg2, bodyB: this.calf2, pointA: { x: 0, y: 25 }, pointB: { x: 0, y: -22 }, stiffness: 0.8 });

    Composite.add(this.world, [this.body, this.leg1, this.leg2, this.calf1, this.calf2, this.joint1, this.joint2, this.knee1, this.knee2]);
  }

  update(dtMs = 16.67) {
    const dt = dtMs / 1000;
    this.time += dt;
    const p = this.params;
    const t = this.time * p.frequency;
    const scale = p.controlScale;

    const leftHip = p.hipAmp * Math.sin(t);
    const rightHip = p.hipAmp * Math.sin(t + p.phaseOffset);
    const leftKnee = p.kneeAmp * Math.sin(t + p.kneeLag);
    const rightKnee = p.kneeAmp * Math.sin(t + p.phaseOffset + p.kneeLag);

    this.applyAngularControl(this.leg1, leftHip * scale, 0.16);
    this.applyAngularControl(this.leg2, rightHip * scale, 0.16);
    this.applyAngularControl(this.calf1, leftKnee * scale, 0.14);
    this.applyAngularControl(this.calf2, rightKnee * scale, 0.14);

    const torsoTarget = p.torsoBias;
    const torsoError = torsoTarget - this.body.angle;
    const stabilizer = Math.max(-0.08, Math.min(0.08, torsoError * p.stabilityGain));
    Body.setAngularVelocity(this.body, this.body.angularVelocity + stabilizer);
    this.controlEffort += Math.abs(leftHip) + Math.abs(rightHip) + Math.abs(leftKnee) + Math.abs(rightKnee) + Math.abs(stabilizer) * 3;
  }

  applyAngularControl(part, targetVel, maxStep) {
    const desired = Math.max(-2.2, Math.min(2.2, targetVel));
    const delta = desired - part.angularVelocity;
    const next = part.angularVelocity + Math.max(-maxStep, Math.min(maxStep, delta));
    Body.setAngularVelocity(part, next);
  }

  remove() {
    [this.body, this.leg1, this.leg2, this.calf1, this.calf2, this.joint1, this.joint2, this.knee1, this.knee2].forEach((item) => Composite.remove(this.world, item));
  }
}
