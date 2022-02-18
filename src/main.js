const Peer = require('skyway-js');

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const screenTrigger = document.getElementById('js-screen-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteScreen = document.getElementById('js-remote-screen-stream');
  const remoteId = document.getElementById('js-remote-id');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const toggleData = document.getElementById('toggle-data');
  const lastDataTime = new Date().getTime();

  const onMouseMove = (dataConnection) => {
    return (e) => {
      if (!toggleData.checked) return;
      if (new Date().getTime() - lastDataTime < 200) return;

      //座標を取得する
      var mX = e.pageX;  //X座標
      var mY = e.pageY;  //Y座標

      dataConnection.send({ mX, mY });
    };
  }

  const onShareScreen = (remoteId) => {
    return async (e) => {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenMediaConnection = peer.call(remoteId, screenStream, { metadata: { screen: true } });

      screenStream.getTracks()[0].addEventListener('ended', () => {
        screenMediaConnection.close(true);
      });

      closeTrigger.addEventListener('click', () => {
        screenMediaConnection.close(true);
        screenStream.getTracks()[0].stop();
      });
    };
  };

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // Register caller handler
  callTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const mediaConnection = peer.call(remoteId.value, localStream);

    mediaConnection.on('stream', async stream => {
      // Render remote stream for caller
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));

    const dataConnection = peer.connect(remoteId.value);

    dataConnection.once('open', async () => {
      document.body.addEventListener("mousemove", onMouseMove(dataConnection));
    });

    dataConnection.on('data', data => {
      console.log(`Remote: ${JSON.stringify(data)}`);
    });

    dataConnection.once('close', () => {
      document.body.removeEventListener("mousemove", onMouseMove(dataConnection));
    });

    closeTrigger.addEventListener('click', () => dataConnection.close(true));

    screenTrigger.addEventListener('click', onShareScreen(remoteId.value));
  });

  peer.once('open', id => (localId.textContent = id));

  // Register callee handler
  peer.on('call', mediaConnection => {
    if (mediaConnection.metadata && mediaConnection.metadata.screen) {
      remoteScreen.style.display = "block"
      mediaConnection.answer(new MediaStream());

      mediaConnection.on('stream', async stream => {
        // Render remote stream for callee
        remoteScreen.srcObject = stream;
        remoteScreen.playsInline = true;
        await remoteScreen.play().catch(console.error);
      });

      mediaConnection.once('close', () => {
        remoteScreen.srcObject.getTracks().forEach(track => track.stop());
        remoteScreen.srcObject = null;
        remoteScreen.style.display = "none"
      });

      closeTrigger.addEventListener('click', () => mediaConnection.close(true));
      return;
    }

    mediaConnection.answer(localStream);

    mediaConnection.on('stream', async stream => {
      // Render remote stream for callee
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));

    screenTrigger.addEventListener('click', onShareScreen(mediaConnection.remoteId));
  });

  // Register connected peer handler
  peer.on('connection', dataConnection => {
    dataConnection.once('open', async () => {
      document.body.addEventListener("mousemove", onMouseMove(dataConnection));
    });

    dataConnection.on('data', data => {
      console.log(`Remote: ${JSON.stringify(data)}`);
    });

    dataConnection.once('close', () => {
      document.body.removeEventListener("mousemove", onMouseMove(dataConnection));
    });

    // Register closing handler
    closeTrigger.addEventListener('click', () => dataConnection.close(true), {
      once: true,
    });
  });

  peer.on('error', console.error);
})();