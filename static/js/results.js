const RESULT_IDS = [
  '1401', '10970', '24373', '29921', '43597', '46483', '47945', '55104',
  '55485', '56117', '56568', '56687', '63471', '64763', '70913', '72126',
  '77389', '77847', '92220', '94725', '95301', '97253', '101950', '105326',
  '106540', '106591', '107251', '110172', '110851', '117909',
];

const results = RESULT_IDS.map((id, index) => ({
  title: `Result ${String(index + 1).padStart(2, '0')}`,
  target: `./static/models/${id}_target.glb`,
  assembly: `./static/models/${id}_assembly.glb`,
}));

const grid = document.querySelector('#results-grid');

function createViewer(className, src, alt) {
  const viewer = document.createElement('model-viewer');
  viewer.className = `result-viewer ${className}`;
  viewer.src = src;
  viewer.alt = alt;
  viewer.setAttribute('camera-controls', '');
  viewer.setAttribute('interaction-prompt', 'none');
  viewer.setAttribute('shadow-intensity', '0.8');
  viewer.setAttribute('exposure', '1');
  return viewer;
}

function createPane(className, viewer) {
  const pane = document.createElement('div');
  pane.className = `result-pane ${className}`;
  pane.append(viewer);
  return pane;
}

function syncCamera(source, target, state) {
  if (state.syncing || !source.loaded || !target.loaded) {
    return;
  }

  state.syncing = true;
  const orbit = source.getCameraOrbit();
  const cameraTarget = source.getCameraTarget();
  target.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
  target.cameraTarget = `${cameraTarget.x}m ${cameraTarget.y}m ${cameraTarget.z}m`;
  target.fieldOfView = `${source.getFieldOfView()}deg`;

  requestAnimationFrame(() => {
    state.syncing = false;
  });
}

function addComparison(stage, result) {
  const targetViewer = createViewer(
    'result-viewer-target',
    result.target,
    `${result.title} target model`
  );
  const assemblyViewer = createViewer(
    'result-viewer-assembly',
    result.assembly,
    `${result.title} assembly model`
  );
  const targetPane = createPane('result-pane-target', targetViewer);
  const assemblyPane = createPane('result-pane-assembly', assemblyViewer);
  const divider = document.createElement('div');
  divider.className = 'result-divider';
  divider.setAttribute('role', 'slider');
  divider.setAttribute('aria-label', 'Target and assembly comparison');
  divider.setAttribute('aria-valuemin', '10');
  divider.setAttribute('aria-valuemax', '90');
  divider.setAttribute('aria-valuenow', '50');
  divider.tabIndex = 0;

  stage.style.setProperty('--split', '50%');
  stage.append(
    targetPane,
    assemblyPane,
    divider,
    createLabel('Target', 'result-label-target'),
    createLabel('Assembly', 'result-label-assembly')
  );

  const cameraState = { syncing: false, activeViewer: null };
  let loadedViewers = 0;
  const syncInitialCamera = () => {
    loadedViewers += 1;
    if (loadedViewers === 2) {
      syncCamera(targetViewer, assemblyViewer, cameraState);
    }
  };
  targetViewer.addEventListener('load', syncInitialCamera, { once: true });
  assemblyViewer.addEventListener('load', syncInitialCamera, { once: true });

  const activateViewer = (viewer) => {
    cameraState.activeViewer = viewer;
  };
  targetViewer.addEventListener('pointerdown', () => activateViewer(targetViewer));
  targetViewer.addEventListener('wheel', () => activateViewer(targetViewer));
  targetViewer.addEventListener('keydown', () => activateViewer(targetViewer));
  assemblyViewer.addEventListener('pointerdown', () => activateViewer(assemblyViewer));
  assemblyViewer.addEventListener('wheel', () => activateViewer(assemblyViewer));
  assemblyViewer.addEventListener('keydown', () => activateViewer(assemblyViewer));

  targetViewer.addEventListener('camera-change', () => {
    if (cameraState.activeViewer === targetViewer) {
      syncCamera(targetViewer, assemblyViewer, cameraState);
    }
  });
  assemblyViewer.addEventListener('camera-change', () => {
    if (cameraState.activeViewer === assemblyViewer) {
      syncCamera(assemblyViewer, targetViewer, cameraState);
    }
  });

  let isDragging = false;

  const setSplit = (clientX) => {
    const bounds = stage.getBoundingClientRect();
    const percent = Math.min(90, Math.max(10, ((clientX - bounds.left) / bounds.width) * 100));
    stage.style.setProperty('--split', `${percent}%`);
    divider.setAttribute('aria-valuenow', Math.round(percent));
  };

  divider.addEventListener('pointerdown', (event) => {
    isDragging = true;
    divider.setPointerCapture(event.pointerId);
    setSplit(event.clientX);
    event.preventDefault();
  });
  divider.addEventListener('pointermove', (event) => {
    if (isDragging) {
      setSplit(event.clientX);
    }
  });
  divider.addEventListener('pointerup', (event) => {
    isDragging = false;
    divider.releasePointerCapture(event.pointerId);
  });
  divider.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    const current = Number(divider.getAttribute('aria-valuenow'));
    const next = Math.min(90, Math.max(10, current + (event.key === 'ArrowLeft' ? -2 : 2)));
    stage.style.setProperty('--split', `${next}%`);
    divider.setAttribute('aria-valuenow', next);
    event.preventDefault();
  });
}

function createLabel(text, className) {
  const label = document.createElement('span');
  label.className = `result-label ${className}`;
  label.textContent = text;
  return label;
}

function createCard(result) {
  const card = document.createElement('article');
  card.className = 'result-card';

  const button = document.createElement('button');
  button.className = 'result-toggle';
  button.type = 'button';
  button.textContent = 'Load';
  button.setAttribute('aria-expanded', 'false');

  const stage = document.createElement('div');
  stage.className = 'result-stage';

  button.addEventListener('click', () => {
    const isLoaded = card.classList.toggle('is-loaded');
    button.textContent = isLoaded ? 'Close' : 'Load';
    button.classList.toggle('is-close', isLoaded);
    button.setAttribute('aria-expanded', String(isLoaded));

    if (isLoaded) {
      addComparison(stage, result);
    } else {
      stage.replaceChildren();
    }
  });

  card.append(stage, button);
  return card;
}

if (grid) {
  results.forEach((result) => grid.append(createCard(result)));
}
