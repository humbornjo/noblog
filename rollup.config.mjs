import typescript from '@rollup/plugin-typescript'

// pkg = require('./package.json')

export default {
  input: 'src/cmds/generate.ts',
  output: [
    {
      file: 'dist/generate.cjs',
      format: 'cjs',
      sourcemap: true
    }, {
      file: 'dist/generate.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [typescript()],
  // external: [...Object.keys(pkg.dependencies), 'fs', 'path'],
}
