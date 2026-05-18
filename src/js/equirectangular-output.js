AFRAME.registerComponent('equirectangular-output', {
  init: function () {
    this.enabledOutput = false;

    var sceneEl = this.el;
    var THREE = window.THREE;

    this.sceneEl = sceneEl;
    this.THREE = THREE;

    this.outputWidth = 4096;
    this.outputHeight = 2048;
    this.cubeSize = 1024;

    this.cubeCamera = new THREE.CubeCamera(0.1, 100000, this.cubeSize);
    sceneEl.object3D.add(this.cubeCamera);

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var geometry = new THREE.PlaneBufferGeometry(2, 2);

    var material = new THREE.ShaderMaterial({
      uniforms: {
        cubemap: { value: this.cubeCamera.renderTarget.texture }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = vec4(position.xy, 0.0, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform samplerCube cubemap;',
        '',
        'const float PI = 3.14159265358979323846264;',
        '',
        'void main() {',
        '  float longitude = (vUv.x * 2.0 - 1.0) * PI;',
        '  float latitude = (vUv.y - 0.5) * PI;',
        '',
        '  vec3 dir;',
        '  dir.x = sin(longitude) * cos(latitude);',
        '  dir.y = sin(latitude);',
        '  dir.z = -cos(longitude) * cos(latitude);',
        '',
        '  gl_FragColor = textureCube(cubemap, normalize(dir));',
        '}'
      ].join('\n'),
      depthWrite: false,
      depthTest: false
    });

    this.quad = new THREE.Mesh(geometry, material);
    this.quadScene.add(this.quad);

    var self = this;

    window.addEventListener('keydown', function (event) {
      if (event.key === 'e' || event.key === 'E') {
        self.enabledOutput = !self.enabledOutput;

        console.log('[EquirectangularOutput] Enabled:', self.enabledOutput);

        if (self.enabledOutput) {
          sceneEl.renderer.setSize(self.outputWidth, self.outputHeight, false);
        }
      }
    });

    console.log('[EquirectangularOutput] Component loaded. Press E inside Mars.');
  },

  tock: function () {
  if (!this.enabledOutput) return;

  var sceneEl = this.sceneEl;
  var renderer = sceneEl.renderer;
  var activeCamera = sceneEl.camera;

  if (!renderer || !activeCamera) return;

  activeCamera.updateMatrixWorld();

  this.cubeCamera.position.setFromMatrixPosition(activeCamera.matrixWorld);

  this.cubeCamera.updateCubeMap(renderer, sceneEl.object3D);

  renderer.autoClear = true;
  renderer.clear();
  renderer.render(this.quadScene, this.quadCamera);

  }
});