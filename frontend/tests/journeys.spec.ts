import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const shots='../artifacts/screenshots';
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.getByText('Hello, Ari.')).toBeVisible({timeout:60000});});
test('policy evidence, leave confirmation, separate manager approval',async({page})=>{
 await fs.mkdir(shots,{recursive:true});await page.screenshot({path:shots+'/01-workspace.png',fullPage:true});
 await page.getByRole('button',{name:'Understand a policy'}).click();
 await expect(page.getByText('Annual leave provides 18 working days', {exact:false})).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Leave & time away'}).first().click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('LEAVE-2');
 await page.screenshot({path:shots+'/02-source.png',fullPage:true});await page.getByRole('button',{name:'Close source'}).click();
 await page.getByLabel('Ask your employee assistant').fill('Check leave November 16–20, 2026');await page.getByRole('button',{name:'Send question'}).click();
 await expect(page.getByRole('button',{name:'Confirm & submit'})).toBeVisible({timeout:60000});
 await expect(page.locator('.draft-metrics')).toContainText('4');await expect(page.getByText('Meridian Foundation Day', {exact:false}).first()).toBeVisible();
 await page.screenshot({path:shots+'/03-confirmation.png',fullPage:true});await page.getByRole('button',{name:'Confirm & submit'}).click();
 await expect(page.getByText('Waiting for your manager')).toBeVisible({timeout:60000});
 await page.getByLabel('Demo identity').selectOption('manager');await expect(page.locator('.profile')).toContainText('Tara Sen');
 await page.getByRole('button',{name:'Manager approvals'}).click();
 const requested=page.locator('.review-card').filter({hasText:'16 Nov 2026'});await expect(requested).toBeVisible();
 await page.screenshot({path:shots+'/04-manager.png',fullPage:true});await requested.getByRole('button',{name:'Approve',exact:true}).click();await expect(requested).toHaveCount(0);
 await page.getByLabel('Demo identity').selectOption('employee');await expect(page.locator('.profile')).toContainText('Ari Sen');await page.getByRole('button',{name:'My leave',exact:true}).click();
 await expect(page.locator('tr').filter({hasText:'16 Nov 2026'})).toContainText('approved');
});
test('unknown policy becomes confirmed HR ticket; report data visible',async({page})=>{
 await page.getByRole('button',{name:'Get a little guidance'}).click();await expect(page.getByRole('button',{name:'Confirm handoff'})).toBeVisible({timeout:60000});await page.getByRole('button',{name:'Confirm handoff'}).click();await expect(page.getByText('HR ticket created')).toBeVisible({timeout:60000});
 await page.getByLabel('Demo identity').selectOption('hr');await expect(page.locator('.profile')).toContainText('Tara Shah');await page.getByRole('button',{name:'HR handoff',exact:true}).click();const ticket=page.locator('.ticket').filter({hasText:'home broadband'}).first();await expect(ticket).toBeVisible();await ticket.getByRole('button',{name:'Resolve'}).click();await expect(page.getByText('Ticket resolved.')).toBeVisible();await expect(ticket.getByText('Resolved',{exact:true})).toBeVisible();await page.screenshot({path:shots+'/05-handoff.png',fullPage:true});
 await page.getByRole('button',{name:'HR analytics',exact:true}).click();await expect(page.locator('.chart-block')).toContainText('Headcount',{ignoreCase:true});await page.getByText('View source data').click();await expect(page.locator('tbody tr')).toHaveCount(5);await page.screenshot({path:shots+'/06-analytics.png',fullPage:true});
 await page.getByRole('button',{name:'Execution & evaluation'}).click();await expect(page.locator('.tool-grid>div')).toHaveCount(9);await page.screenshot({path:shots+'/07-evaluation.png',fullPage:true});
});
test('cancel and role restriction; compact mobile layout',async({page})=>{
 await page.getByRole('button',{name:'Plan some time off'}).click();await expect(page.getByRole('button',{name:'Confirm & submit'})).toBeVisible({timeout:60000});await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByText('Cancelled. Nothing was submitted.',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'HR analytics',exact:true}).click();await expect(page.getByRole('heading',{name:'HR analyst workspace'})).toBeVisible();
 await page.getByRole('button',{name:'Employee assistant',exact:true}).click();await page.setViewportSize({width:390,height:844});
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);await page.screenshot({path:shots+'/08-mobile.png',fullPage:true});
});
