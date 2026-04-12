import { requireAdminPage } from './auth-guard.js';
import { setupAdminLayout } from './layout.js';
import {
  byId,
  inputValue,
  setStatus,
} from './shared.js';
import {
  buildEmptyProductDraft,
  loadEditableProduct,
  removeOverride,
  saveOverride,
  toOverridePayload,
} from './product-service.js';

const { profile, user } = await requireAdminPage();
setupAdminLayout({ activeNav: 'products', profile, user });

let currentBarcode = '';

const productFieldIds = {
  additiveTags: 'productAdditives',
  adminPriorityScore: 'productAdminPriorityScore',
  adminGradeLabel: 'productAdminGradeLabel',
  adminScore: 'productAdminScore',
  adminSummary: 'productAdminSummary',
  adminVerdict: 'productAdminVerdict',
  allergens: 'productAllergens',
  brand: 'productBrand',
  calories100g: 'calories100g',
  categories: 'productCategories',
  featuredNote: 'productFeaturedNote',
  featuredRank: 'productFeaturedRank',
  fiber100g: 'fiber100g',
  healthierAlternatives: 'productAlternatives',
  imageUrl: 'productImageUrl',
  ingredientsText: 'productIngredients',
  isFeatured: 'productIsFeatured',
  labels: 'productLabels',
  name: 'productName',
  nameReason: 'productNameReason',
  notes: 'productNotes',
  protein100g: 'protein100g',
  quantity: 'productQuantity',
  recipe: 'productRecipe',
  reviewBadgeCopy: 'productReviewBadgeCopy',
  reviewStatus: 'productReviewStatus',
  salt100g: 'salt100g',
  saturatedFat100g: 'saturatedFat100g',
  sourceNote: 'productSourceNote',
  sugar100g: 'sugar100g',
};

function setPreview(draft) {
  byId('previewName').textContent = draft.name || 'Untitled product';
  byId('previewBrand').textContent = draft.brand || 'Brand not set';
  byId('previewScore').textContent = draft.adminScore ? `Admin score ${draft.adminScore}` : 'No admin score set';
  byId('previewAlternatives').textContent = draft.healthierAlternatives
    ? `${draft.healthierAlternatives.split('\n').filter(Boolean).length} healthier alternative link(s) saved`
    : 'No healthier alternatives saved yet.';

  const imageHost = byId('productImagePreview');
  const imageUrl = draft.imageUrl?.trim();

  if (!imageUrl) {
    imageHost.className = 'image-preview image-placeholder';
    imageHost.innerHTML = 'No image yet';
    return;
  }

  imageHost.className = 'image-preview';
  imageHost.innerHTML = `<img alt="Product preview" src="${imageUrl}" />`;
}

const initialBarcode = new URLSearchParams(window.location.search).get('barcode') || '';

function readFormField(id) {
  const element = byId(id);

  if (element.type === 'checkbox') {
    return element.checked;
  }

  return element.value;
}

function writeFormField(id, value) {
  const element = byId(id);

  if (element.type === 'checkbox') {
    element.checked = Boolean(value);
    return;
  }

  element.value = inputValue(value);
}

function fillProductForm(draft) {
  Object.entries(productFieldIds).forEach(([field, id]) => {
    writeFormField(id, draft[field]);
  });
  setPreview(draft);
}

function clearProductForm() {
  currentBarcode = '';
  byId('barcodeInput').value = '';
  fillProductForm(buildEmptyProductDraft(''));
  setStatus('productStatus', 'Draft cleared. Load a barcode to continue.', 'neutral');
  byId('productSource').textContent = '';
}

async function handleLoadProduct() {
  currentBarcode = byId('barcodeInput').value.trim();

  if (!currentBarcode) {
    setStatus('productStatus', 'Enter a barcode first.', 'warning');
    return;
  }

  setStatus('productStatus', 'Loading product details...', 'neutral');

  try {
    const { draft, hasOverride, offProduct } = await loadEditableProduct(currentBarcode);
    fillProductForm(draft);
    byId('productSource').textContent =
      `${offProduct ? 'Open Food Facts match found.' : 'No Open Food Facts match.'} ` +
      `${hasOverride ? 'Existing Firestore product record loaded.' : 'Starting from live or blank data.'}`;
    setStatus('productStatus', 'Product ready to edit.', 'success');
  } catch (error) {
    setStatus(
      'productStatus',
      error instanceof Error ? error.message : 'Product lookup failed.',
      'danger'
    );
  }
}

byId('loadProductButton').addEventListener('click', () => void handleLoadProduct());
byId('clearProductFormButton').addEventListener('click', clearProductForm);

byId('productForm').addEventListener('input', () => {
  const draft = Object.fromEntries(
    Object.entries(productFieldIds).map(([field, id]) => [field, readFormField(id)])
  );
  setPreview(draft);
});

byId('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentBarcode) {
    setStatus('productStatus', 'Load a barcode before saving.', 'warning');
    return;
  }

  const formValue = Object.fromEntries(
    Object.entries(productFieldIds).map(([field, id]) => [field, readFormField(id)])
  );

  if (!String(formValue.name || '').trim()) {
    setStatus('productStatus', 'Product name is required before saving.', 'warning');
    return;
  }

  try {
    await saveOverride(currentBarcode, toOverridePayload({ ...formValue, barcode: currentBarcode }));
    setStatus('productStatus', 'Product record saved to Firestore.', 'success');
  } catch (error) {
    setStatus(
      'productStatus',
      error instanceof Error ? error.message : 'Product record save failed.',
      'danger'
    );
  }
});

byId('deleteProductButton').addEventListener('click', async () => {
  if (!currentBarcode) {
    setStatus('productStatus', 'Load a barcode before deleting.', 'warning');
    return;
  }

  try {
    await removeOverride(currentBarcode);
    fillProductForm(buildEmptyProductDraft(currentBarcode));
    setStatus('productStatus', 'Product deleted.', 'success');
    byId('productSource').textContent = '';
  } catch (error) {
    setStatus(
      'productStatus',
      error instanceof Error ? error.message : 'Delete failed.',
      'danger'
    );
  }
});

fillProductForm(buildEmptyProductDraft(''));

if (initialBarcode) {
  byId('barcodeInput').value = initialBarcode;
  void handleLoadProduct();
}
