import { useTranslation } from "i18nexus";
import { renderToStaticMarkup } from "react-dom/server";

import { ClientProvider } from "./ClientProvider";

jest.mock("next/dynamic", () => () => () => null);
jest.mock("@/shared/ui", () => ({
  Analytics: () => null,
  FirebaseStatus: () => null,
  GlobalErrorProvider: ({ children }: { children: React.ReactNode }) => children,
  ScrollRestorer: () => null,
}));
jest.mock("@/widgets/Navigation", () => () => null);

function HomeHero() {
  const { t } = useTranslation("home");

  return <h1>{t("글로벌 앱을 위한")}</h1>;
}

describe("ClientProvider server rendering", () => {
  it("renders the English homepage translation in the initial HTML", () => {
    const html = renderToStaticMarkup(
      <ClientProvider language="en">
        <HomeHero />
      </ClientProvider>
    );

    expect(html).toContain("Type-safe i18n");
    expect(html).not.toContain("글로벌 앱을 위한");
  });

  it("renders the Korean homepage translation in the initial HTML", () => {
    const html = renderToStaticMarkup(
      <ClientProvider language="ko">
        <HomeHero />
      </ClientProvider>
    );

    expect(html).toContain("글로벌 앱을 위한");
  });
});
