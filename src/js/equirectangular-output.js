var Scene = require('./core/scene').Scene;

AFRAME.registerComponent('equirectangular-output', {
  init: function () {
    var self = this;

    this.sceneEl = this.el;
    this.THREE = window.THREE;

    this.params = new URLSearchParams(window.location.search);
    this.isCaveOutput = this.params.get('caveOutput') === '1';

    this.enabledOutput = false;
    this.latestSyncData = null;
    this.lastRequestedSite = null;
    this.loadingLabelHideAt = Date.now() + 4000;

    this.outputWidth = 4096;
    this.outputHeight = 2048;
    this.cubeSize = 1024;

    this.channel = null;

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('access-mars-sync');

      this.channel.onmessage = function (event) {
        if (!self.isCaveOutput) return;
        self.latestSyncData = event.data;
      };
    } else {
      console.warn('[EquirectangularOutput] BroadcastChannel not supported.');
    }

    this.cubeCamera = new this.THREE.CubeCamera(0.1, 100000, this.cubeSize);
    this.sceneEl.object3D.add(this.cubeCamera);

    this.quadScene = new this.THREE.Scene();
    this.quadCamera = new this.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var geometry = new this.THREE.PlaneBufferGeometry(2, 2);

    this.material = new this.THREE.ShaderMaterial({
      uniforms: {
        cubemap: { value: this.cubeCamera.renderTarget.texture },
        yawOffset: { value: 0.0 }
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
        'uniform float yawOffset;',
        '',
        'const float PI = 3.14159265358979323846264;',
        '',
        'void main() {',
        '  float longitude = ((vUv.x * 2.0 - 1.0) * PI) + yawOffset;',
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

    this.quad = new this.THREE.Mesh(geometry, this.material);
    this.quadScene.add(this.quad);

    window.addEventListener('keydown', function (event) {
      if (event.key === 'e' || event.key === 'E') {
        self.enabledOutput = !self.enabledOutput;
        console.log('[EquirectangularOutput] Enabled:', self.enabledOutput);
      }
    });

    if (this.isCaveOutput) {
      this.enabledOutput = true;
      console.log('[EquirectangularOutput] CAVE output mode active.');
    } else {
      console.log('[EquirectangularOutput] Normal controller mode active.');
    }
  },

  tick: function () {
    var playerEl = document.querySelector('#player');
    var cameraEl = document.querySelector('#camera');

    if (!playerEl || !cameraEl) return;

    if (!this.isCaveOutput) {
      this.broadcastNormalView(playerEl, cameraEl);
    } else {
      this.applyCaveSync(playerEl, cameraEl);
    }
  },

  tock: function () {
    if (!this.enabledOutput) return;

    var sceneEl = this.sceneEl;
    var renderer = sceneEl.renderer;
    var activeCamera = sceneEl.camera;

    if (!renderer || !activeCamera) return;

    this.updateCaveLoadingLabel();

    activeCamera.updateMatrixWorld();

    this.cubeCamera.position.setFromMatrixPosition(activeCamera.matrixWorld);
    this.cubeCamera.updateCubeMap(renderer, sceneEl.object3D);

    if (this.latestSyncData && this.material && this.material.uniforms.yawOffset) {
      var yaw = -(this.latestSyncData.cameraRotation.y || 0);

      // First location has a different starting alignment.
      if (this.latestSyncData.site === 'landing_site') {
        yaw -= 1.0;
      }

      this.material.uniforms.yawOffset.value = yaw;
    }

    renderer.autoClear = true;
    renderer.clear();
    renderer.render(this.quadScene, this.quadCamera);
  },

  getCurrentSiteName: function () {
    if (Scene.nextSite) return Scene.nextSite;
    if (Scene.currentSite) return Scene.currentSite;
    return null;
  },

  getInfoCardState: function () {
    var el = document.querySelector('#info-card');

    if (!el || !el.components || !el.components['info-card']) {
      return null;
    }

    return {
      visible: el.getAttribute('visible'),
      isVisibleState: el.is('visible'),
      data: Object.assign({}, el.components['info-card'].data)
    };
  },

  getEntitySyncState: function (selector) {
    var el = document.querySelector(selector);

    if (!el) {
      return null;
    }

    return {
      selector: selector,
      visible: el.getAttribute('visible'),
      isVisibleState: el.is('visible'),
      innerHTML: el.innerHTML
    };
  },

  broadcastNormalView: function (playerEl, cameraEl) {
    if (!this.channel) return;

    var playerPos = playerEl.object3D.position;
    var playerRot = playerEl.object3D.rotation;

    var cameraPos = cameraEl.object3D.position;
    var cameraRot = cameraEl.object3D.rotation;

    this.channel.postMessage({
      site: this.getCurrentSiteName(),
      currentSite: Scene.currentSite || null,
      nextSite: Scene.nextSite || null,

      infoCard: this.getInfoCardState(),
      mapCard: this.getEntitySyncState('#map-card'),
      orientationCard: this.getEntitySyncState('#orientation-card'),

      playerPosition: {
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z
      },
      playerRotation: {
        x: playerRot.x,
        y: playerRot.y,
        z: playerRot.z
      },
      cameraPosition: {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z
      },
      cameraRotation: {
        x: cameraRot.x,
        y: cameraRot.y,
        z: cameraRot.z
      }
    });
  },

  applyInfoCardSync: function (state) {
    var el = document.querySelector('#info-card');

    if (!el || !el.components || !el.components['info-card']) {
      return;
    }

    if (!state) {
      el.setAttribute('visible', false);
      el.removeState('visible');
      return;
    }

    if (state.data) {
      el.setAttribute('info-card', state.data);
    }

    if (typeof state.visible !== 'undefined') {
      el.setAttribute('visible', state.visible);
    }

    if (state.isVisibleState) {
      el.addState('visible');
    } else {
      el.removeState('visible');
    }
  },

  applyEntitySync: function (state) {
    if (!state || !state.selector) return;

    var el = document.querySelector(state.selector);

    if (!el) return;

    if (typeof state.visible !== 'undefined') {
      el.setAttribute('visible', state.visible);
    }

    if (state.isVisibleState) {
      if (!el.is('visible')) {
        el.addState('visible');
      }
    } else {
      if (el.is('visible')) {
        el.removeState('visible');
      }
    }

    if (typeof state.innerHTML === 'string' && el.innerHTML !== state.innerHTML) {
      el.innerHTML = state.innerHTML;
    }

    el.object3D.visible = state.visible !== false;
  },

  updateCaveLoadingLabel: function () {
    if (!this.isCaveOutput) return;

    var loadingLabel = document.querySelector('#scene-label-intro');

    if (!loadingLabel) return;

    if (Date.now() > this.loadingLabelHideAt) {
      loadingLabel.setAttribute('visible', false);
      loadingLabel.object3D.visible = false;
    }
  },

  applyCaveSync: function (playerEl, cameraEl) {
    if (!this.latestSyncData) return;

    var d = this.latestSyncData;

    this.applyInfoCardSync(d.infoCard);
    this.applyEntitySync(d.mapCard);
    this.applyEntitySync(d.orientationCard);

    if (d.site && d.site !== Scene.currentSite && d.site !== this.lastRequestedSite) {
      console.log('[EquirectangularOutput] Changing CAVE site to:', d.site);
      this.lastRequestedSite = d.site;

      Scene.onClickScene(d.site);

      // Allow the loading label briefly, then force-hide it again.
      this.loadingLabelHideAt = Date.now() + 4000;

      return;
    }

    playerEl.object3D.position.set(
      d.playerPosition.x,
      d.playerPosition.y,
      d.playerPosition.z
    );

    playerEl.object3D.rotation.set(
      d.playerRotation.x,
      d.playerRotation.y,
      d.playerRotation.z
    );

    cameraEl.object3D.position.set(
      d.cameraPosition.x,
      d.cameraPosition.y,
      d.cameraPosition.z
    );

    cameraEl.object3D.rotation.set(
      d.cameraRotation.x,
      d.cameraRotation.y,
      d.cameraRotation.z
    );

    playerEl.object3D.updateMatrixWorld(true);
    cameraEl.object3D.updateMatrixWorld(true);
  }
});