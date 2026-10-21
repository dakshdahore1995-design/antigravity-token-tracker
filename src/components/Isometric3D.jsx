import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, Eye, Sparkles, Layers, Info } from 'lucide-react';

export default function Isometric3D({
  calendarDays,
  onSelectDay,
  filteredMetric,
  selectedModel
}) {
  const containerRef = useRef(null);
  const [hoveredData, setHoveredData] = useState(null);
  const [colorMode, setColorMode] = useState('heat'); // 'heat' or 'model'
  const [heightScale, setHeightScale] = useState(1.0);
  const [isAutoRotate, setIsAutoRotate] = useState(false);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshesRef = useRef([]);
  const animFrameRef = useRef(null);

  // Model color mapping (matching Image 4 colorful categories)
  const MODEL_COLORS = {
    'claude-opus-4-6-thinking': 0xa855f7, // Purple
    'claude-sonnet-4-6': 0x3b82f6,        // Electric Blue
    'gemini-3.1-pro-low': 0xec4899,       // Pink/Magenta
    'gemini-3.8-flash-high': 0x00ff88,    // Neon Green
    'gemini-3.8-flash-medium': 0xeab308,  // Amber Yellow
    'gemini-3.6-flash-low': 0x14b8a6,     // Teal
    'default': 0x64748b                   // Slate
  };

  // Heat Level color mapping
  const HEAT_COLORS = [
    0x121722, // Level 0: empty / dim
    0x0e4429, // Level 1
    0x006d32, // Level 2
    0x26a641, // Level 3
    0x39d353, // Level 4
    0x00ff88, // Level 5: Neon Green
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 520;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.005);

    // 2. Camera: Isometric orthographic or perspective with isometric angle
    const aspect = width / height;
    const d = 35;
    const camera = new THREE.OrthographicCamera(
      -d * aspect,
      d * aspect,
      d,
      -d,
      1,
      1000
    );
    cameraRef.current = camera;

    // Standard 45° isometric angle (like Image 4)
    camera.position.set(45, 45, 45);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.replaceChildren(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 60, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const greenPoint = new THREE.PointLight(0x00ff88, 2, 80);
    greenPoint.position.set(0, 20, 0);
    scene.add(greenPoint);

    // 5. Build 3D Isometric Grid of Blocks
    // Arrange in 52 columns × 7 rows (aligned to X and Z)
    const weeks = [];
    let currentWeek = [];
    calendarDays.forEach((day, index) => {
      currentWeek.push(day);
      if (day.day_of_week === 6 || index === calendarDays.length - 1) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Grid center offset
    const cols = weeks.length;
    const rows = 7;
    const spacing = 1.35;
    const offsetX = (cols * spacing) / 2;
    const offsetZ = (rows * spacing) / 2;

    const blockGeometry = new THREE.BoxGeometry(1.15, 1, 1.15);
    const meshes = [];

    // Base ground plane
    const groundGeo = new THREE.PlaneGeometry(cols * spacing + 6, rows * spacing + 6);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e17,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.55;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid line helper
    const gridHelper = new THREE.GridHelper(Math.max(cols * spacing, rows * spacing) + 4, cols, 0x1c2638, 0x111827);
    gridHelper.position.y = -0.54;
    scene.add(gridHelper);

    weeks.forEach((week, colIdx) => {
      week.forEach((day, rowIdx) => {
        if (!day) return;

        const tokens = day.total_tokens || 0;
        // Height formula: non-linear scale so even modest token days pop up
        let h = 0.2;
        if (tokens >= 50) {
          h = Math.min(18, 0.4 + Math.log10(tokens) * 2.2 * heightScale);
        }

        // Color determination
        let col = HEAT_COLORS[day.level || 0];
        if (colorMode === 'model' && day.top_model) {
          col = MODEL_COLORS[day.top_model] || MODEL_COLORS['default'];
        }

        const mat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.35,
          metalness: 0.25,
          emissive: day.level === 5 ? 0x00ff88 : (day.level >= 3 ? 0x006d32 : 0x000000),
          emissiveIntensity: day.level === 5 ? 0.65 : 0.15,
        });

        const mesh = new THREE.Mesh(blockGeometry, mat);
        const posX = colIdx * spacing - offsetX;
        const posZ = rowIdx * spacing - offsetZ;
        const posY = h / 2;

        mesh.scale.set(1, h, 1);
        mesh.position.set(posX, posY, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { day, originalColor: col, height: h };

        scene.add(mesh);
        meshes.push(mesh);
      });
    });

    meshesRef.current = meshes;

    // 6. Interactive Mouse Raycasting & Controls
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1000, -1000);
    let hoveredMesh = null;

    let isMouseDown = false;
    let prevMousePos = { x: 0, y: 0 };
    let spherical = { radius: 75, theta: Math.PI / 4, phi: Math.PI / 3 };

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const onMouseDown = (e) => {
      isMouseDown = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        spherical.theta -= deltaX * 0.008;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, spherical.phi - deltaY * 0.008));
        updateCamera();
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.05;
      camera.zoom = Math.max(0.4, Math.min(3.0, camera.zoom - e.deltaY * 0.001 * zoomSpeed));
      camera.updateProjectionMatrix();
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshesRef.current);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.day) {
          onSelectDay(hit.userData.day);
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);

    // 7. Render Loop
    let angle = spherical.theta;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (isAutoRotate && !isMouseDown) {
        angle += 0.002;
        spherical.theta = angle;
        updateCamera();
      }

      // Raycast hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshesRef.current);

      if (intersects.length > 0) {
        const currentHit = intersects[0].object;
        if (hoveredMesh !== currentHit) {
          if (hoveredMesh) {
            hoveredMesh.material.emissive.setHex(hoveredMesh.userData.day?.level === 5 ? 0x00ff88 : 0x000000);
            hoveredMesh.scale.x = 1;
            hoveredMesh.scale.z = 1;
          }
          hoveredMesh = currentHit;
          hoveredMesh.material.emissive.setHex(0x00e5ff);
          hoveredMesh.scale.x = 1.15;
          hoveredMesh.scale.z = 1.15;
          setHoveredData(currentHit.userData.day);
        }
      } else {
        if (hoveredMesh) {
          hoveredMesh.material.emissive.setHex(hoveredMesh.userData.day?.level === 5 ? 0x00ff88 : 0x000000);
          hoveredMesh.scale.x = 1;
          hoveredMesh.scale.z = 1;
          hoveredMesh = null;
          setHoveredData(null);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight || 520;
      const newAspect = newW / newH;
      camera.left = -d * newAspect;
      camera.right = d * newAspect;
      camera.top = d;
      camera.bottom = -d;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, [calendarDays, colorMode, heightScale, isAutoRotate]);

  const resetCamera = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(45, 45, 45);
    cameraRef.current.zoom = 1;
    cameraRef.current.updateProjectionMatrix();
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div className="isometric-container glass-panel">
      {/* 3D View Toolbar */}
      <div className="isometric-toolbar">
        <div className="isometric-title-group">
          <h2 className="isometric-title">
            <Sparkles size={18} className="text-neon" />
            3D Isometric Token Matrix
          </h2>
          <span className="isometric-subtitle">
            Interactive extruded pillars (Pillar Height = Daily Tokens) • Drag to rotate • Scroll to zoom
          </span>
        </div>

        <div className="isometric-controls-group">
          {/* Color Mode Switcher */}
          <div className="iso-btn-group">
            <button
              className={`iso-control-btn ${colorMode === 'heat' ? 'active' : ''}`}
              onClick={() => setColorMode('heat')}
              title="Color by Token Heat Intensity"
            >
              <Layers size={14} />
              <span>Green Heat</span>
            </button>
            <button
              className={`iso-control-btn ${colorMode === 'model' ? 'active' : ''}`}
              onClick={() => setColorMode('model')}
              title="Color by Active AI Model"
            >
              <Eye size={14} />
              <span>By Model</span>
            </button>
          </div>

          {/* Auto rotate */}
          <button
            className={`iso-control-btn ${isAutoRotate ? 'active' : ''}`}
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            title="Toggle 360° Auto-spin"
          >
            <RotateCw size={14} className={isAutoRotate ? 'spin-anim' : ''} />
            <span>Spin</span>
          </button>

          {/* Reset View */}
          <button
            className="iso-control-btn"
            onClick={resetCamera}
            title="Reset Isometric Angle"
          >
            <span>Reset 45°</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Box */}
      <div className="isometric-canvas-wrapper" ref={containerRef}>
        {/* Render Canvas injected here */}
      </div>

      {/* Hover Info HUD Overlay */}
      {hoveredData && (
        <div className="iso-hud-overlay">
          <div className="hud-date">{hoveredData.date}</div>
          <div className="hud-tokens text-neon">
            {(hoveredData.total_tokens || 0).toLocaleString()} tokens
          </div>
          <div className="hud-meta">
            <span>In: {(hoveredData.input_tokens || 0).toLocaleString()}</span>
            <span>Out: {(hoveredData.output_tokens || 0).toLocaleString()}</span>
            <span className="text-amber">${hoveredData.cost_usd?.toFixed(2)}</span>
          </div>
          {hoveredData.top_model && (
            <div className="hud-model text-blue">{hoveredData.top_model}</div>
          )}
          <div className="hud-action">Click pillar for deep session breakdown</div>
        </div>
      )}

      {/* Legend below 3D matrix */}
      <div className="iso-legend-footer">
        {colorMode === 'heat' ? (
          <div className="iso-heat-legend">
            <span>Flat = &lt;50 tokens</span>
            <span className="heat-dot level-1"></span>
            <span className="heat-dot level-2"></span>
            <span className="heat-dot level-3"></span>
            <span className="heat-dot level-4"></span>
            <span className="heat-dot level-5 neon-blaster"></span>
            <span className="text-neon">Tower Pillar = Peak &gt;5M - 10M+ tokens</span>
          </div>
        ) : (
          <div className="iso-model-legend">
            <span className="model-pill"><span className="color-box" style={{ background: '#3b82f6' }}></span> Claude Sonnet</span>
            <span className="model-pill"><span className="color-box" style={{ background: '#00ff88' }}></span> Gemini Flash High</span>
            <span className="model-pill"><span className="color-box" style={{ background: '#eab308' }}></span> Gemini Flash Med</span>
            <span className="model-pill"><span className="color-box" style={{ background: '#ec4899' }}></span> Gemini Pro</span>
            <span className="model-pill"><span className="color-box" style={{ background: '#a855f7' }}></span> Claude Opus</span>
          </div>
        )}
      </div>
    </div>
  );
}
