// Square selection utilities (moved from practice-board)
export function toggleSquareSelection(square) {
    const squareEl = document.querySelector(`[data-square="${square}"]`);
    if (squareEl) {
        if (squareEl.classList.contains("right-click-selected")) {
            squareEl.classList.remove("right-click-selected");
        }
        else {
            squareEl.classList.add("right-click-selected");
        }
    }
}
export function clearRightClickSelections() {
    document.querySelectorAll(".right-click-selected").forEach((el) => {
        el.classList.remove("right-click-selected");
    });
}
//# sourceMappingURL=practice-rmb.js.map