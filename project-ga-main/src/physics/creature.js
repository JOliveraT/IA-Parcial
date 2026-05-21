import Matter from "matter-js";

const { Bodies, Constraint, Composite, Body } = Matter;
const CREATURE_COLORS = {
  body: "#ff7043",
  thigh: "#42a5f5",
  calf: "#26a69a",
  joint: "#eceff1",
};

export class Creature {
  constructor(world, x, y, genes) {
    this.world = world;
    this.genes = genes;
    this.startX = x;
    this.time = 0;

    this.createBody(x, y);
  }

  createBody(x, y) {
    // Cuerpo principal
    this.body = Bodies.rectangle(x, y, 60, 20, {
      friction: 0.8,
      render: {
        fillStyle: CREATURE_COLORS.body,
      },
    });
    // Pierna1
    this.leg1 = Bodies.rectangle(x - 20, y + 40, 10, 50, {
      friction: 1,
      render: {
        fillStyle: CREATURE_COLORS.thigh,
      },
    });
    // Pierna2
    this.leg2 = Bodies.rectangle(x + 20, y + 40, 10, 50, {
      friction: 1,
      render: {
        fillStyle: CREATURE_COLORS.thigh,
      },
    });
    // Pantorrilla1
    this.calf1 = Bodies.rectangle(x - 20, y + 90, 9, 45, {
      friction: 1,
      render: {
        fillStyle: CREATURE_COLORS.calf,
      },
    });
    // Pantorrilla2
    this.calf2 = Bodies.rectangle(x + 20, y + 90, 9, 45, {
      friction: 1,
      render: {
        fillStyle: CREATURE_COLORS.calf,
      },
    });

    this.joint1 = Constraint.create({
      bodyA: this.body,
      bodyB: this.leg1,
      pointA: { x: -20, y: 10 },
      pointB: { x: 0, y: -25 },
      stiffness: 0.9,
      render: {
        strokeStyle: CREATURE_COLORS.joint,
        lineWidth: 2,
      },
    });

    this.joint2 = Constraint.create({
      bodyA: this.body,
      bodyB: this.leg2,
      pointA: { x: 20, y: 10 },
      pointB: { x: 0, y: -25 },
      stiffness: 0.9,
      render: {
        strokeStyle: CREATURE_COLORS.joint,
        lineWidth: 2,
      },
    });
    // Rodilla izquierda
    this.knee1 = Constraint.create({
      bodyA: this.leg1,
      bodyB: this.calf1,
      pointA: { x: 0, y: 25 },
      pointB: { x: 0, y: -22 },
      stiffness: 0.8,
      render: {
        strokeStyle: CREATURE_COLORS.joint,
        lineWidth: 2,
      },
    });
    // Rodilla derecha
    this.knee2 = Constraint.create({
      bodyA: this.leg2,
      bodyB: this.calf2,
      pointA: { x: 0, y: 25 },
      pointB: { x: 0, y: -22 },
      stiffness: 0.8,
      render: {
        strokeStyle: CREATURE_COLORS.joint,
        lineWidth: 2,
      },
    });

    Composite.add(this.world, [
      this.body,
      this.leg1,
      this.leg2,
      this.calf1,
      this.calf2,
      this.joint1,
      this.joint2,
      this.knee1,
      this.knee2,
    ]);
  }

  update() {
    this.time += 0.05;

    const amplitude = this.genes[0];
    const frequency = this.genes[1];
    const force = this.genes[2];

    const angle1 = amplitude * Math.sin(frequency * this.time);

    const angle2 = amplitude * Math.sin(frequency * this.time + Math.PI);

    Body.setAngularVelocity(this.leg1, angle1 * force);

    Body.setAngularVelocity(this.leg2, angle2 * force);
  }

  getFitness() {
    return this.body.position.x;
  }

  remove() {
    Composite.remove(this.world, this.body);
    Composite.remove(this.world, this.leg1);
    Composite.remove(this.world, this.leg2);
    Composite.remove(this.world, this.calf1);
    Composite.remove(this.world, this.calf2);
    Composite.remove(this.world, this.joint1);
    Composite.remove(this.world, this.joint2);
    Composite.remove(this.world, this.knee1);
    Composite.remove(this.world, this.knee2);
  }
}
