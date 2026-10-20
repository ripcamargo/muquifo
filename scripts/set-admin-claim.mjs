// Alternativa ao documento admins/{uid}: grava a custom claim { admin: true } num usuário.
// Roda só na SUA máquina, com uma chave de conta de serviço (nunca publique esse arquivo).
//
// Uso:
//   npm install --no-save firebase-admin
//   set GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\service-account.json   (PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="...")
//   npm run set-admin -- email@exemplo.com
//   npm run set-admin -- email@exemplo.com --remove

let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  console.error('Instale antes: npm install --no-save firebase-admin');
  process.exit(1);
}

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error('Informe o e-mail: npm run set-admin -- email@exemplo.com');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho da chave da conta de serviço.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const user = await admin.auth().getUserByEmail(email);
const remove = flag === '--remove';
await admin.auth().setCustomUserClaims(user.uid, remove ? { admin: null } : { ...(user.customClaims ?? {}), admin: true });
console.log(`${remove ? 'Removida' : 'Concedida'} a permissão de administrador para ${email} (uid ${user.uid}).`);
console.log('A pessoa precisa sair e entrar de novo no painel para a mudança valer.');
