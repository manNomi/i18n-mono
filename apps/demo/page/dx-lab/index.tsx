"use client";

import { useLanguageSwitcher, useTranslation } from "i18nexus";

import { Callout, CodeBlock, PageShell, Section } from "@/shared/ui";

const demoCode = `"use client";

import { useTranslation } from "i18nexus";

export function BillingHero() {
  const { t, isReady } = useTranslation("billing");

  if (!isReady) return <p>{t("Loading...")}</p>;

  return <h1>{t("결제 현지화가 준비되었습니다")}</h1>;
}`;

const observations = [
  {
    tone: "success",
    title: "강점 1",
    body: "namespace 이름만 넘기면 lazy load가 시작되어서, 소비자 코드는 생각보다 짧았습니다.",
  },
  {
    tone: "success",
    title: "강점 2",
    body: "fallback namespace가 자연스럽게 섞여서 공통 로딩/버튼 문구를 중복하지 않아도 됩니다.",
  },
  {
    tone: "warning",
    title: "마찰 1",
    body: "새 namespace를 추가해도 생성 타입은 자동 갱신되지 않습니다. typed workflow라면 extractor 실행 안내가 더 선명해야 합니다.",
  },
  {
    tone: "warning",
    title: "마찰 2",
    body: "현재 패키지 export에는 devtools subpath가 없어 이 데모는 Provider, hook, fallback 흐름만 검증합니다.",
  },
] as const;

export default function DxLabPage() {
  const { t, currentLanguage, isReady } = useTranslation("dx-lab");
  const { availableLanguages, changeLanguage, isLoading } =
    useLanguageSwitcher();

  return (
    <PageShell
      eyebrow={t("실사용 DX 점검")}
      title={t("라이브러리를 직접 써보며 만든 데모")}
      description={t(
        "이 페이지는 preload하지 않은 dx-lab namespace를 useTranslation(\"dx-lab\") 호출만으로 불러옵니다."
      )}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          label={t("Lazy namespace")}
          value={isReady ? t("로드 완료") : t("로딩 중")}
          detail={t("preloadNamespaces에 없는 namespace를 자동 요청")}
        />
        <StatusCard
          label={t("Fallback lookup")}
          value={t("Loading...")}
          detail={t("dx-lab에 없는 공통 키는 common에서 해결")}
        />
        <StatusCard
          label={t("현재 언어")}
          value={currentLanguage.toUpperCase()}
          detail={t("언어 변경 시 t snapshot이 새로 계산됨")}
        />
        <StatusCard
          label={t("t identity")}
          value={isReady ? t("준비됨") : t("로딩 중")}
          detail={t("언어 변경 후 새 번역 snapshot을 렌더링")}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Section
          title={t("언어 전환")}
          description={t(
            "버튼을 누르면 Provider 상태, 쿠키, 현재 페이지 번역이 함께 바뀝니다."
          )}
          className="mb-0"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {availableLanguages.map((language) => {
              const active = currentLanguage === language.code;

              return (
                <button
                  key={language.code}
                  type="button"
                  disabled={isLoading}
                  onClick={() => changeLanguage(language.code)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {language.flag}
                  </span>
                  <span className="ml-2 font-semibold">{language.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title={t("사용하면서 느낀 피드백")} className="mb-0">
          <div className="grid gap-3 md:grid-cols-2">
            {observations.map((item) => (
              <Callout key={item.title} title={t(item.title)} tone={item.tone}>
                {t(item.body)}
              </Callout>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title={t("소비자 코드 예시")}
        description={t(
          "lazy namespace, fallback 문구, ready 상태를 한 화면에서 확인합니다."
        )}
        className="mt-6"
      >
        <CodeBlock>{demoCode}</CodeBlock>
      </Section>

      <Callout title={t("Devtools 상태")} tone="info">
        {t(
          "현재 구현 기준으로 i18nexus/devtools는 export되지 않으므로 페이지에서는 렌더링하지 않습니다."
        )}
      </Callout>
    </PageShell>
  );
}

function StatusCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
