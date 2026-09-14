export const noindexRobots = { name: "robots", content: "noindex" } as const;

export function privatePageHead(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      noindexRobots,
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  };
}
