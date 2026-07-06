customElements.get("pickup-availability") ||
  customElements.define(
    "pickup-availability",
    class extends HTMLElement {
      constructor() {
        super();
        if (!this.hasAttribute("available")) return;
        const tpl = this.querySelector("template");
        const first = tpl && tpl.content && tpl.content.firstElementChild;
        if (!first) return;
        this.errorHtml = first.cloneNode(true);
        this.onClickRefreshList = this.onClickRefreshList.bind(this);
        this.fetchAvailability(this.getAttribute("data-variant-id"));
      }
      fetchAvailability(variantId) {
        let rootUrl = this.getAttribute("data-root-url");
        if (!rootUrl || !variantId) return;
        rootUrl.endsWith("/") || (rootUrl = rootUrl + "/");
        const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;
        fetch(variantSectionUrl)
          .then((response) => response.text())
          .then((responseText) => {
            const sectionInnerHTML = new DOMParser()
              .parseFromString(responseText, "text/html")
              .querySelector(".shopify-section");
            this.renderPreview(sectionInnerHTML);
          })
          .catch(() => {
            const button = this.querySelector("button");
            button && button.removeEventListener("click", this.onClickRefreshList);
            this.renderError();
          });
      }
      onClickRefreshList() {
        this.fetchAvailability(this.getAttribute("data-variant-id"));
      }
      update(variant) {
        if (variant && variant.available) {
          this.fetchAvailability(variant.id);
        } else {
          this.innerHTML = "";
          this.removeAttribute("available");
          this.setAttribute("hidden", "");
        }
      }
      renderError() {
        this.innerHTML = "";
        if (!this.errorHtml) return;
        this.appendChild(this.errorHtml);
        const button = this.querySelector("button");
        button && button.addEventListener("click", this.onClickRefreshList);
      }
      renderPreview(sectionInnerHTML) {
        const drawer = document.querySelector(".pickup-availability-drawer");
        if (drawer) drawer.remove();
        if (!sectionInnerHTML || !sectionInnerHTML.querySelector(".pickup-availability-preview")) {
          this.innerHTML = "";
          this.removeAttribute("available");
          this.setAttribute("hidden", "");
          return;
        }
        this.innerHTML = sectionInnerHTML.querySelector(".pickup-availability-preview").outerHTML;
        this.removeAttribute("hidden");
        this.setAttribute("available", "");
        const drawerEl = sectionInnerHTML.querySelector(".pickup-availability-drawer");
        if (drawerEl) document.body.appendChild(drawerEl);
      }
    }
  );
