export function initManusRuntime() {
  console.log('Manus Runtime Initialized (Mock)');
}

export function subscribeSafeAreaInsets(callback: any) {
  // Mock safe area insets for web
  callback({
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
  });
  return () => {};
}
