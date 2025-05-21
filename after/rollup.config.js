import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      file: './dist/rxfx-after.prod.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-after.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-after.min.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-after.umd.js',
      format: 'umd',
      exports: 'named',
      name: 'after',
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
};
