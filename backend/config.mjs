const clean = value => typeof value === 'string' ? value.trim() : '';

export function credentialsFromEnv(env = process.env) {
  const sharedScrappa = clean(env.SCRAPPA_API_KEY);
  return {
    googlePlay: clean(env.SCRAPPA_GOOGLE_PLAY_API_KEY) || sharedScrappa,
    xProfile: clean(env.SCRAPPA_X_PROFILE_API_KEY) || sharedScrappa,
    xUserSearch: clean(env.SCRAPPA_X_USER_SEARCH_API_KEY) || sharedScrappa,
    xPostSearch: clean(env.SCRAPPA_X_POST_SEARCH_API_KEY) || sharedScrappa,
    facebookProfile: clean(env.SCRAPPA_FACEBOOK_PROFILE_API_KEY) || sharedScrappa,
    gemini: clean(env.GEMINI_API_KEY),
    youtube: clean(env.YOUTUBE_API_KEY),
    tavily: clean(env.TAVILY_API_KEY),
  };
}

export function providerSettingsFromEnv(env = process.env) {
  return {
    geminiModel: clean(env.GEMINI_MODEL) || 'gemini-3.5-flash',
  };
}

export function isConfigured(value) {
  if (!value) return false;
  return !/^(your_|replace_|api_key$)/i.test(value);
}

export function credentialStatus(credentials) {
  return Object.fromEntries(
    Object.entries(credentials).map(([name, value]) => [name, isConfigured(value) ? 'configured' : 'missing']),
  );
}
