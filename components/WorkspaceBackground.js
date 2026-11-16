'use client';

import Antigravity from './Antigravity';

export default function WorkspaceBackground() {
  return (
    <div className="workspace-background" aria-hidden="true">
      <Antigravity
        colors={['#5227FF', '#FF9FFC', '#B497CF']}
        count={1500}
        magnetRadius={9}
        ringRadius={7}
        particleSize={0.9}
        autoAnimate={true}
      />
    </div>
  );
}
