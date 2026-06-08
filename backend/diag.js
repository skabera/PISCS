try {
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Current directory:', process.cwd());
  console.log('Path:', process.env.PATH.split(';').filter(p => !p.includes('node_modules')));

  const modules = ['express', 'sqlite3', 'bcryptjs', 'jsonwebtoken', 'dotenv', 'cors'];
  modules.forEach(m => {
    try {
      require.resolve(m);
      console.log(`[OK] ${m}`);
    } catch (e) {
      console.log(`[FAIL] ${m}: ${e.message}`);
    }
  });

} catch (err) {
  console.error('Diagnostic failed:', err);
}
