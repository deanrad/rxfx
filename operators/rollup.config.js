import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: [
    {
      file: './dist/rxfx-operators.prod.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-operators.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: './dist/rxfx-operators.min.js',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
};
