// Square selection utilities (moved from practice-board)
export function toggleSquareSelection(square: string): void {
  const squareEl = document.querySelector(
    `[data-square="${square}"]`,
  ) as HTMLElement;
  if (squareEl) {
    if (squareEl.classList.contains("right-click-selected")) {
      squareEl.classList.remove("right-click-selected");
    } else {
      squareEl.classList.add("right-click-selected");
    }
  }
}

export function clearRightClickSelections(): void {
  document.querySelectorAll(".right-click-selected").forEach((el) => {
    (el as HTMLElement).classList.remove("right-click-selected");
  });
}
