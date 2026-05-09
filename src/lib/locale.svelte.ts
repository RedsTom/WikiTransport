import { getLocale, setLocale as setParaglideLocale, locales } from '$lib/paraglide/runtime';

type Locale = (typeof locales)[number];

let _locale = $state<Locale>(getLocale());

export function setLocale(locale: Locale) {
	setParaglideLocale(locale, { reload: false });
	_locale = locale;
}

export function useLocale() {
	return _locale;
}
