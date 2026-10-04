(function (root) {
  'use strict';

  const BACKUP_FORMAT = 'renovation-furnishing-planner-backup';
  const BACKUP_VERSION = 1;
  const clone = value => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const asNumber = value => Number(value) || 0;
  const itemCost = item => asNumber(item.actual) || asNumber(item.estimated);
  const landedCost = product => asNumber(product.price) + asNumber(product.shipping) + asNumber(product.fees);

  function localDateStamp(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function csvCell(value) {
    let text = String(value ?? '');
    const numericText = /^-?\d+(?:\.\d+)?$/.test(text.trim());
    if (!numericText && /^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function makeCsv(headers, rows) {
    return '\ufeff' + [
      headers.map(csvCell).join(','),
      ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))
    ].join('\r\n');
  }

  function scenarioProducts(scenario, state) {
    return scenario.productIds.map(id => state.products.find(product => product.id === id)).filter(Boolean);
  }

  function scenarioTotal(scenario, state) {
    return scenarioProducts(scenario, state).reduce((sum, product) => sum + landedCost(product), 0);
  }

  function buildCsvExport(kind, state, date = new Date()) {
    const stamp = localDateStamp(date);
    let filename = '';
    let headers = [];
    let rows = [];

    if (kind === 'budget') {
      filename = `renovation-planner-budget-${stamp}.csv`;
      headers = ['Item Name', 'Category', 'Sub-category', 'Room / Area', 'Budget Amount (RM)', 'Estimated Cost (RM)', 'Actual Cost (RM)', 'Amount Paid (RM)', 'Variance Budget minus Actual (RM)', 'Outstanding Amount (RM)', 'Seller / Contractor', 'Status', 'Notes'];
      rows = state.expenses.map(item => ({
        'Item Name': item.name,
        'Category': item.category,
        'Sub-category': item.subcategory,
        'Room / Area': item.room,
        'Budget Amount (RM)': asNumber(item.budget).toFixed(2),
        'Estimated Cost (RM)': asNumber(item.estimated).toFixed(2),
        'Actual Cost (RM)': asNumber(item.actual).toFixed(2),
        'Amount Paid (RM)': asNumber(item.paid).toFixed(2),
        'Variance Budget minus Actual (RM)': (asNumber(item.budget) - asNumber(item.actual)).toFixed(2),
        'Outstanding Amount (RM)': Math.max(0, itemCost(item) - asNumber(item.paid)).toFixed(2),
        'Seller / Contractor': item.seller,
        'Status': item.status,
        'Notes': item.notes
      }));
    } else if (kind === 'shopping') {
      filename = `renovation-planner-shopping-${stamp}.csv`;
      headers = ['Product Name', 'Product Category', 'Option Name', 'Seller / Platform', 'Product Price (RM)', 'Shipping Cost (RM)', 'Other Fees (RM)', 'Total Landed Cost (RM)', 'Size / Dimensions', 'Product Link', 'Notes', 'Rating / Personal Score', 'Shortlisted'];
      rows = state.products.map(product => ({
        'Product Name': product.productName,
        'Product Category': product.category,
        'Option Name': product.optionName,
        'Seller / Platform': product.seller,
        'Product Price (RM)': asNumber(product.price).toFixed(2),
        'Shipping Cost (RM)': asNumber(product.shipping).toFixed(2),
        'Other Fees (RM)': asNumber(product.fees).toFixed(2),
        'Total Landed Cost (RM)': landedCost(product).toFixed(2),
        'Size / Dimensions': product.dimensions,
        'Product Link': product.link,
        'Notes': product.notes,
        'Rating / Personal Score': asNumber(product.rating),
        'Shortlisted': product.shortlisted ? 'Yes' : 'No'
      }));
    } else if (kind === 'scenarios') {
      filename = `renovation-planner-scenarios-${stamp}.csv`;
      headers = ['Scenario Name', 'Scenario Total (RM)', 'Scenario Item Count', 'Product Name', 'Product Category', 'Option Name', 'Seller / Platform', 'Product Price (RM)', 'Shipping Cost (RM)', 'Other Fees (RM)', 'Total Landed Cost (RM)', 'Rating / Personal Score', 'Shortlisted'];
      rows = state.scenarios.flatMap(scenario => {
        const products = scenarioProducts(scenario, state);
        const base = {
          'Scenario Name': scenario.name,
          'Scenario Total (RM)': scenarioTotal(scenario, state).toFixed(2),
          'Scenario Item Count': products.length
        };
        return products.length ? products.map(product => ({
          ...base,
          'Product Name': product.productName,
          'Product Category': product.category,
          'Option Name': product.optionName,
          'Seller / Platform': product.seller,
          'Product Price (RM)': asNumber(product.price).toFixed(2),
          'Shipping Cost (RM)': asNumber(product.shipping).toFixed(2),
          'Other Fees (RM)': asNumber(product.fees).toFixed(2),
          'Total Landed Cost (RM)': landedCost(product).toFixed(2),
          'Rating / Personal Score': asNumber(product.rating),
          'Shortlisted': product.shortlisted ? 'Yes' : 'No'
        })) : [base];
      });
    } else {
      throw new Error('Unknown CSV export type.');
    }

    return { filename, contents: makeCsv(headers, rows), rowCount: rows.length, headers };
  }

  function createBackup(state, categories, now = new Date()) {
    const known = new Set(['totalBudget', 'categories', 'appSettings', 'customData', 'expenses', 'products', 'scenarios']);
    const additional = {};
    Object.entries(state).forEach(([key, value]) => { if (!known.has(key)) additional[key] = value; });
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      appSettings: { currency: 'MYR', ...(state.appSettings || {}), totalBudget: asNumber(state.totalBudget) },
      categories: [...categories],
      budgetTracker: clone(state.expenses),
      shoppingComparator: clone(state.products),
      scenarios: clone(state.scenarios),
      customData: { ...(state.customData || {}), ...clone(additional) }
    };
  }

  function ensureUniqueIds(records, label) {
    const ids = new Set();
    records.forEach((record, index) => {
      if (!isObject(record) || typeof record.id !== 'string' || !record.id.trim()) {
        throw new Error(`${label} record ${index + 1} does not have a valid ID.`);
      }
      if (ids.has(record.id)) throw new Error(`${label} data contains a duplicate ID: ${record.id}.`);
      ids.add(record.id);
    });
    return ids;
  }

  function ensureNonNegativeNumbers(records, fields, label) {
    records.forEach((record, index) => fields.forEach(field => {
      const value = record[field];
      if (value === undefined || value === null || value === '') return;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} record ${index + 1} has an invalid ${field} value.`);
    }));
  }

  function normalizeBackup(backup, options = {}) {
    const defaults = Array.isArray(options.defaultCategories) ? options.defaultCategories : [];
    const statuses = Array.isArray(options.statuses) ? options.statuses : [];
    if (!isObject(backup)) throw new Error('The selected file is not a valid planner backup.');
    if (backup.format !== undefined && backup.format !== BACKUP_FORMAT) throw new Error('This JSON file is not a Renovation & Furnishing Planner backup.');
    if (backup.version !== undefined && backup.version !== BACKUP_VERSION) throw new Error('This backup version is not supported by this app.');

    const expenses = backup.budgetTracker ?? backup.expenses;
    const products = backup.shoppingComparator ?? backup.products;
    const scenarios = backup.scenarios;
    if (!Array.isArray(expenses) || !Array.isArray(products) || !Array.isArray(scenarios)) {
      throw new Error('The backup is missing budget, shopping, or scenario data.');
    }

    ensureUniqueIds(expenses, 'Budget');
    const productIds = ensureUniqueIds(products, 'Shopping');
    ensureUniqueIds(scenarios, 'Scenario');
    ensureNonNegativeNumbers(expenses, ['budget', 'estimated', 'actual', 'paid'], 'Budget');
    ensureNonNegativeNumbers(products, ['price', 'shipping', 'fees', 'rating'], 'Shopping');

    expenses.forEach((item, index) => {
      if (typeof item.name !== 'string' || !item.name.trim()) throw new Error(`Budget record ${index + 1} is missing an item name.`);
      if (item.status !== undefined && statuses.length && !statuses.includes(item.status)) throw new Error(`Budget record ${index + 1} has an unknown status.`);
    });
    products.forEach((product, index) => {
      if (typeof product.productName !== 'string' || !product.productName.trim() || typeof product.optionName !== 'string' || !product.optionName.trim()) {
        throw new Error(`Shopping record ${index + 1} is missing a product or option name.`);
      }
    });
    scenarios.forEach((scenario, index) => {
      if (typeof scenario.name !== 'string' || !scenario.name.trim() || !Array.isArray(scenario.productIds) || !scenario.productIds.every(id => typeof id === 'string')) {
        throw new Error(`Scenario record ${index + 1} is invalid.`);
      }
      const missing = scenario.productIds.find(id => !productIds.has(id));
      if (missing) throw new Error(`Scenario “${scenario.name}” refers to a shopping option that is not in this backup.`);
    });

    const providedCategories = backup.categories === undefined ? defaults : backup.categories;
    if (!Array.isArray(providedCategories)) throw new Error('The backup does not contain valid categories.');
    const categoryValues = [
      ...providedCategories,
      ...expenses.map(item => item.category),
      ...products.map(product => product.category)
    ];
    const categories = [...new Set(categoryValues.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
    if (!categories.length) categories.push(...defaults);

    if (backup.appSettings !== undefined && !isObject(backup.appSettings)) throw new Error('The backup contains invalid app settings.');
    if (backup.customData !== undefined && !isObject(backup.customData)) throw new Error('The backup contains invalid custom data.');
    const appSettings = backup.appSettings || {};
    const totalBudgetValue = appSettings.totalBudget ?? backup.totalBudget ?? 0;
    const totalBudget = Number(totalBudgetValue);
    if (!Number.isFinite(totalBudget) || totalBudget < 0) throw new Error('The backup contains an invalid total budget.');

    return {
      totalBudget,
      categories,
      appSettings: { currency: 'MYR', ...clone(appSettings), totalBudget },
      customData: clone(backup.customData || {}),
      expenses: clone(expenses),
      products: clone(products),
      scenarios: clone(scenarios)
    };
  }

  function parseBackupText(text, options = {}) {
    let backup;
    try {
      backup = JSON.parse(text);
    } catch {
      throw new Error('This file is not valid JSON. Choose an unmodified planner backup file.');
    }
    return normalizeBackup(backup, options);
  }

  root.HearthplanPortability = {
    BACKUP_FORMAT,
    BACKUP_VERSION,
    buildCsvExport,
    createBackup,
    localDateStamp,
    makeCsv,
    normalizeBackup,
    parseBackupText
  };
})(typeof window === 'undefined' ? globalThis : window);
