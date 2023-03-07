import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      file: './dist/rxfx-peer.prod.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-peer.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-peer.min.js',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
};
