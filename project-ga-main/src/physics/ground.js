import Matter from 'matter-js';

const { Bodies, World } = Matter;

export function createGround(world) {
  const ground = Bodies.rectangle(1400, 700, 3400, 40, {
    isStatic: true,
    friction: 1.2,
    frictionStatic: 2.5,
    render: { fillStyle: '#7aa876' },
  });

  World.add(world, ground);
  return ground;
}
