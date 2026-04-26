export interface NativeSpeechSpeakInput {
  readonly text: string;
  readonly lang?: string;
  readonly rate?: number;
  readonly onEnd: () => void;
  readonly onError: (error: Error) => void;
}

export interface NativeSpeechController {
  readonly isSupported: () => boolean;
  readonly speak: (input: NativeSpeechSpeakInput) => void;
  readonly stop: () => void;
}

type SpeechUtteranceWithEvents = SpeechSynthesisUtterance &
  Partial<EventTarget> & {
    onend: null | (() => void);
    onerror: null | ((event: { error?: string }) => void);
  };

function getSpeechEnvironment(): {
  readonly speechSynthesis?: SpeechSynthesis;
  readonly SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  readonly navigator?: Navigator;
  readonly document?: Document;
} {
  const candidate = globalThis as typeof globalThis & {
    speechSynthesis?: SpeechSynthesis;
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    navigator?: Navigator;
    document?: Document;
  };

  return {
    speechSynthesis: candidate.speechSynthesis,
    SpeechSynthesisUtterance: candidate.SpeechSynthesisUtterance,
    navigator: candidate.navigator,
    document: candidate.document,
  };
}

function resolveSpeechLang(explicitLang?: string): string | undefined {
  const lang = explicitLang?.trim();
  if (lang) {
    return lang;
  }

  const environment = getSpeechEnvironment();
  const documentLang = environment.document?.documentElement.lang?.trim();
  if (documentLang) {
    return documentLang;
  }

  const navigatorLang = environment.navigator?.language?.trim();
  return navigatorLang || undefined;
}

function selectVoice(
  speechSynthesis: SpeechSynthesis,
  lang: string | undefined,
): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) {
    return null;
  }

  if (!lang) {
    return voices.find((voice) => voice.default) ?? voices[0] ?? null;
  }

  const normalizedLang = lang.toLowerCase();
  const primaryLanguage = normalizedLang.split("-")[0];
  const exactMatch = voices.find((voice) => voice.lang.toLowerCase() === normalizedLang);
  if (exactMatch) {
    return exactMatch;
  }

  const primaryMatch = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(`${primaryLanguage}-`),
  );
  if (primaryMatch) {
    return primaryMatch;
  }

  return voices.find((voice) => voice.default) ?? voices[0] ?? null;
}

export function createNativeSpeechController(): NativeSpeechController {
  return {
    isSupported() {
      const environment = getSpeechEnvironment();
      return Boolean(environment.speechSynthesis && environment.SpeechSynthesisUtterance);
    },

    speak(input) {
      const environment = getSpeechEnvironment();
      if (!environment.speechSynthesis || !environment.SpeechSynthesisUtterance) {
        throw new Error("Speech synthesis unavailable.");
      }

      const utterance = new environment.SpeechSynthesisUtterance(input.text);
      const lang = resolveSpeechLang(input.lang);
      if (lang) {
        utterance.lang = lang;
      }

      const voice = selectVoice(environment.speechSynthesis, utterance.lang || lang);
      if (voice) {
        utterance.voice = voice;
      }
      if (typeof input.rate === "number" && Number.isFinite(input.rate)) {
        utterance.rate = input.rate;
      }

      const handleEnd = () => {
        input.onEnd();
      };
      const handleError = (event: Event) => {
        const speechEvent = event as SpeechSynthesisErrorEvent;
        input.onError(new Error(speechEvent.error ?? "Speech synthesis failed."));
      };
      const eventfulUtterance = utterance as SpeechUtteranceWithEvents;
      if (typeof eventfulUtterance.addEventListener === "function") {
        eventfulUtterance.addEventListener("end", handleEnd);
        eventfulUtterance.addEventListener("error", handleError);
      } else {
        eventfulUtterance.onend = handleEnd;
        eventfulUtterance.onerror = (event) => {
          handleError({ error: event.error } as SpeechSynthesisErrorEvent);
        };
      }

      environment.speechSynthesis.speak(utterance);
    },

    stop() {
      const environment = getSpeechEnvironment();
      environment.speechSynthesis?.cancel();
    },
  };
}
