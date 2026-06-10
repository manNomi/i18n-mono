/** @jest-environment jsdom */

import { onAuthStateChanged } from "firebase/auth";
import { getDocs } from "firebase/firestore";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import FirebaseStatus from "@/shared/ui/FirebaseStatus";

jest.mock("@/shared/lib/firebase", () => ({
  auth: { app: "auth" },
  db: { app: "db" },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "collection-ref"),
  getDocs: jest.fn(),
  limit: jest.fn(() => "limit-ref"),
  query: jest.fn(() => "query-ref"),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockedOnAuthStateChanged = onAuthStateChanged as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockUnsubscribe = jest.fn();

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("FirebaseStatus", () => {
  let container: HTMLDivElement;
  let root: Root;
  let currentUser: { email?: string | null } | null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    currentUser = null;
    mockedGetDocs.mockResolvedValue({ docs: [] });
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(currentUser);
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  it("does not show Firebase diagnostics to public visitors", async () => {
    currentUser = null;

    await act(async () => {
      root.render(<FirebaseStatus />);
      await flushPromises();
    });

    expect(container.textContent).toBe("");
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it("shows Firebase diagnostics after an admin account is logged in", async () => {
    currentUser = { email: "admin@example.com" };

    await act(async () => {
      root.render(<FirebaseStatus />);
      await flushPromises();
    });

    expect(container.textContent).toContain("Firebase");
    expect(container.textContent).toContain("Connected");
    expect(container.textContent).toContain("admin@example.com");
    expect(mockedGetDocs).toHaveBeenCalledTimes(1);
  });
});
