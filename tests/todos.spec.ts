import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/todos', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'First todo',
            completed: false,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          }
        ])
      });
      return;
    }
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: body.title,
          completed: false,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        })
      });
      return;
    }
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'First todo',
          completed: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        })
      });
      return;
    }
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.continue();
  });
});

# AC-1: A user can create a todo from the frontend and see it appear after a successful backend round trip
# AC-2: A user can view an existing list of todos loaded from the backend when opening the app
# AC-3: A user can update a todo's completion state from the frontend and the changed state persists after a refresh
# AC-4: A user can delete a todo from the frontend and it no longer appears after the backend confirms deletion
# AC-5: Frontend handles empty and error states while using the literal todo API shapes

test('todo app loads the initial list and shows todo data from the API', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('First todo')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.getByRole('checkbox')).not.toBeChecked();
});

test('todo app creates a todo through the form and renders the new item', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New todo').fill('Write tests');
  await page.getByRole('button', { name: 'Add todo' }).click();

  await expect(page.getByText('Write tests')).toBeVisible();
});

test('todo app toggles completion when the checkbox is clicked', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('checkbox').click();

  await expect(page.getByRole('checkbox')).toBeChecked();
});

test('todo app deletes an item when the delete button is clicked', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('First todo')).not.toBeVisible();
});

test('todo app shows an empty state when the API returns no todos', async ({ page }) => {
  await page.unroute('**/api/todos');
  await page.route('**/api/todos', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.goto('/');

  await expect(page.getByText('No todos yet')).toBeVisible();
});

test('todo app shows an error state when the API request fails', async ({ page }) => {
  await page.unroute('**/api/todos');
  await page.route('**/api/todos', async route => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'boom' }) });
  });

  await page.goto('/');

  await expect(page.getByText('Failed to load todos')).toBeVisible();
});
