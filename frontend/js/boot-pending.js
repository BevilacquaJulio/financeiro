(function () {
  try {
    if (sessionStorage.getItem("fin_boot_loading")) {
      document.documentElement.classList.add("boot-loading-pending");
    }
  } catch (e) {}
})();
