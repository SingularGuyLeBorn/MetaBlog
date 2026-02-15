# RL Algorithm Visualization Demo

This page demonstrates the new interactive **Algorithm Visualizer** component. Below is a step-by-step visualization of a **Q-Learning** agent in a simple 4x4 Grid World.

<AlgorithmVisualizer
  title="Q-Learning: Finding the Goal"
  :data="{
    gridSize: [4, 4],
    gridLayout: [
      { x: 0, y: 0, type: 'start', value: 0 },
      { x: 0, y: 1, type: 'empty', value: 0 },
      { x: 0, y: 2, type: 'empty', value: 0 },
      { x: 0, y: 3, type: 'empty', value: 0 },
      { x: 1, y: 0, type: 'empty', value: 0 },
      { x: 1, y: 1, type: 'wall', value: 0 },
      { x: 1, y: 2, type: 'trap', value: -10 },
      { x: 1, y: 3, type: 'empty', value: 0 },
      { x: 2, y: 0, type: 'empty', value: 0 },
      { x: 2, y: 1, type: 'empty', value: 0 },
      { x: 2, y: 2, type: 'empty', value: 0 },
      { x: 2, y: 3, type: 'empty', value: 0 },
      { x: 3, y: 0, type: 'empty', value: 0 },
      { x: 3, y: 1, type: 'empty', value: 0 },
      { x: 3, y: 2, type: 'empty', value: 0 },
      { x: 3, y: 3, type: 'goal', value: 10 }
    ],
    steps: [
      {
        step: 0,
        agent: { x: 0, y: 0 },
        description: 'Initialize Q-Table. Agent changes state at (0,0).',
        formula: 'Q(s, a) = 0',
        variables: { State: '(0,0)', Epsilon: '1.0' }
      },
      {
        step: 1,
        agent: { x: 0, y: 1 },
        description: 'Agent moves RIGHT (Random Action). Reward = 0.',
        formula: 'Q(s,a) \\leftarrow Q(s,a) + \\alpha [r + \\gamma \\max Q(s\', a\') - Q(s,a)]',
        variables: { State: '(0,1)', Action: 'RIGHT', Reward: '0', 'Q_new': '0' }
      },
      {
        step: 2,
        agent: { x: 0, y: 2 },
        description: 'Agent moves RIGHT again.',
        variables: { State: '(0,2)', Action: 'RIGHT', Reward: '0' }
      },
      {
        step: 3,
        agent: { x: 0, y: 3 },
        description: 'Agent moves RIGHT.',
        variables: { State: '(0,3)', Action: 'RIGHT', Reward: '0' }
      },
      {
        step: 4,
        agent: { x: 1, y: 3 },
        description: 'Agent moves DOWN. Avoids wall.',
        variables: { State: '(1,3)', Action: 'DOWN', Reward: '0' }
      },
      {
        step: 5,
        agent: { x: 2, y: 3 },
        description: 'Agent moves DOWN.',
        variables: { State: '(2,3)', Action: 'DOWN', Reward: '0' }
      },
      {
        step: 6,
        agent: { x: 3, y: 3 },
        description: 'Agent moves DOWN to GOAL! Large Reward! Update Q((2,3), DOWN).',
        formula: 'Q((2,3), DOWN) \\leftarrow 0 + 0.1 [10 + 0.9(0) - 0] = 1.0',
        variables: { State: '(3,3)', Action: 'DOWN', Reward: '10', 'Q_new': '1.0' },
        gridUpdates: [
          { x: 2, y: 3, value: 1.0, qValues: { down: 1.0 } }
        ]
      },
      {
        step: 7,
        agent: { x: 0, y: 0 },
        description: 'Episode 2 Start. Reset to (0,0).',
        variables: { State: '(0,0)' }
      }
    ]
  }"
/>

## Markdown Styling Tests

Below are tests for the newly added markdown plugins:

- **Mark**: ==Highlighed Text== using `==text==`.
- **Insert**: ++Inserted Text++ using `++text++`.
- **Subscript**: H~2~O using `~text~`.
- **Superscript**: E = mc^2^ using `^text^`.
- **Abbreviation**: The *[HTML]: Hyper Text Markup Language* specification is maintained by the W3C. Hover over HTML.

---

*[HTML]: Hyper Text Markup Language
*[W3C]:  World Wide Web Consortium
