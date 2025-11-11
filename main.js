import * as THREE from 'https://unpkg.com/three@0.166.0/build/three.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer;
let controls;
let points, basePositions = [];
let analyser, dataArray;
let audioContext, audioElement;
let isPlaying = false;
let animationId;

init();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 3;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const material = new THREE.PointsMaterial({
    color: 0x66ccff,
    size: 0.03,
    transparent: true,
    opacity: 0.9,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    basePositions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }

  document.getElementById('audioFile').addEventListener('change', handleFile);
  document.getElementById('startStopButton').addEventListener('click', togglePlayback);
  window.addEventListener('resize', onResize);

  animate(); // Start loop even without audio
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (audioContext) audioContext.close();

  audioContext = new AudioContext();
  audioElement = new Audio(URL.createObjectURL(file));
  audioElement.loop = true;

  const source = audioContext.createMediaElementSource(audioElement);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const button = document.getElementById('startStopButton');
  button.disabled = false;
  button.textContent = 'Start';
}

function togglePlayback() {
  const button = document.getElementById('startStopButton');
  if (!audioElement) return;

  if (isPlaying) {
    audioElement.pause();
    cancelAnimationFrame(animationId);
    button.textContent = 'Start';
  } else {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    audioElement.play();
    animate();
    button.textContent = 'Stop';
  }
  isPlaying = !isPlaying;
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (controls) controls.update();

  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    const pos = points.geometry.attributes.position;
    const len = pos.count;

    for (let i = 0; i < len; i++) {
      const freqIndex = Math.floor((i / len) * dataArray.length);
      const amp = dataArray[freqIndex] / 255;

      const baseIndex = i * 3;
      const x = basePositions[baseIndex];
      const y = basePositions[baseIndex + 1];
      const z = basePositions[baseIndex + 2];

      const scale = 1 + amp * 0.7;
      pos.setXYZ(i, x * scale, y * scale, z * scale);
    }

    pos.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
