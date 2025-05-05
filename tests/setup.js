// グローバルなfetchのモック
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    redirected: false,
    status: 200,
    statusText: 'OK',
    type: 'basic',
    url: 'http://example.com'
  })
)

// AudioContextのモック
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 1 }
  }),
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn()
  }),
  createMediaElementSource: jest.fn().mockReturnValue({
    connect: jest.fn()
  })
}))

// ResizeObserverのモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
})) 