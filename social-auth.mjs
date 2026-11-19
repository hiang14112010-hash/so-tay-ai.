import { firebaseConfig, enabledProviders } from './social-auth-config.mjs?v=1';

const sdkURL = 'https://www.gstatic.com/firebasejs/13.4.0/';
const allowedProviders = ['google', 'facebook'];

export function browserSocialAuth() {
  if (!firebaseConfig?.projectId || !firebaseConfig?.appId || !firebaseConfig?.authDomain || !firebaseConfig?.apiKey) return null;
  const providers = [...new Set(enabledProviders)].filter(provider => allowedProviders.includes(provider));
  if (!providers.length) return null;
  let auth;
  let sdk;
  let preparing;
  let verifiedProvider;

  return {
    providers,

    prepare() {
      return preparing ??= Promise.all([
        import(sdkURL + 'firebase-app.js'),
        import(sdkURL + 'firebase-auth.js')
      ]).then(([{ initializeApp }, authSDK]) => {
        sdk = authSDK;
        const app = initializeApp(firebaseConfig, 'so-tay-ai');
        auth = sdk.initializeAuth(app, {
          persistence: sdk.inMemoryPersistence,
          popupRedirectResolver: sdk.browserPopupRedirectResolver
        });
      });
    },

    async signIn(provider) {
      if (!auth || !providers.includes(provider)) throw new Error('Đăng nhập mạng xã hội chưa sẵn sàng.');
      verifiedProvider = null;
      const account = provider === 'google' ? new sdk.GoogleAuthProvider() : new sdk.FacebookAuthProvider();
      if (provider === 'google') account.setCustomParameters({ prompt: 'select_account' });
      try {
        await sdk.signInWithPopup(auth, account);
        verifiedProvider = provider;
      } catch (error) {
        const messages = {
          'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.',
          'auth/popup-closed-by-user': 'Cửa sổ đăng nhập đã đóng. Bạn có thể thử lại.',
          'auth/account-exists-with-different-credential': 'Email này đã đăng ký bằng một phương thức khác. Hãy dùng phương thức đó.',
          'auth/unauthorized-domain': 'Tên miền Sổ tay AI chưa được phép đăng nhập trong Firebase.',
          'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được bật trong Firebase.'
        };
        throw new Error(messages[error.code] || 'Chưa đăng nhập được. Hãy kiểm tra kết nối rồi thử lại.');
      }
    },

    identity() {
      const user = auth?.currentUser;
      if (!user || !verifiedProvider) return null;
      return { key: firebaseConfig.projectId + ':' + user.uid, name: user.displayName, provider: verifiedProvider };
    },

    async clear() {
      verifiedProvider = null;
      if (auth?.currentUser) await sdk.signOut(auth);
    }
  };
}
