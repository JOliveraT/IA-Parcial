import Matter from 'matter-js';

const { Engine, Render, Runner } = Matter;

export function createWorld({ headless = false } = {}) {
  const engine = Engine.create();
  let render = null;
  let runner = null;

  if (!headless) {
    const canvas = document.getElementById('world');
    render = Render.create({
      canvas,
      engine,
      options: { width: window.innerWidth, height: window.innerHeight, wireframes: false, background: '#222' },
    });
    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);
  }

  return { engine, world: engine.world, render, runner };
}
