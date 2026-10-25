/* Kinora settings you can edit.
   siteUrl         the public address of the website (used for invite links and email links in the apps)
   googleClientId  the Web client ID of your Google OAuth client ("1234-abc.apps.googleusercontent.com").
                   With it, the web page shows Google's own sign-in button, which names your site instead of the Supabase address.
                   Leave it empty to use the normal Supabase redirect sign-in.
   deepLink        where the Windows and Android apps return after Google sign-in (add it to Supabase > Authentication > URL Configuration > Redirect URLs) */
window.KINORA_CONFIG={
  siteUrl:'https://kinor4.vercel.app',
  appName:'Kinora',
  deepLink:'kinora://auth',
  googleClientId:''
};
