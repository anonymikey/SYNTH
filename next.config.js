module.exports = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/dev-updates/cloudflare-voice-personalization',
        destination: '/dev-updates/synth-media-tools',
        permanent: true,
      },
      {
        source: '/dev-updates/provider-order',
        destination: '/dev-updates/synth-routing-and-reliability',
        permanent: true,
      },
    ];
  },
};
