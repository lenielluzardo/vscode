/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TerminalTab } from 'vs/workbench/contrib/terminal/browser/terminalTab';
import { IListService, WorkbenchObjectTree } from 'vs/platform/list/browser/listService';
import { ITreeElement, ITreeNode, ITreeRenderer } from 'vs/base/browser/ui/tree/tree';
import { DefaultStyleController, IListAccessibilityProvider } from 'vs/base/browser/ui/list/listWidget';
import { IAccessibilityService } from 'vs/platform/accessibility/common/accessibility';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IIdentityProvider, IListVirtualDelegate } from 'vs/base/browser/ui/list/list';
import { ITerminalInstance, ITerminalService, ITerminalTab } from 'vs/workbench/contrib/terminal/browser/terminal';
import { localize } from 'vs/nls';
import * as DOM from 'vs/base/browser/dom';


const $ = DOM.$;

class TerminalTabsDelegate implements IListVirtualDelegate<TerminalTab> {
	getHeight(element: any): number {
		return 24;
	}
	getTemplateId(element: any): string {
		return 'terminal.tabs';
	}
}
class TerminalTabsIdentityProvider implements IIdentityProvider<TabTreeNode> {
	constructor() {
	}
	getId(element: TabTreeNode): { toString(): string; } {
		if ('children' in element) {
			return element.tab ? element.tab.terminalInstances.length > 1 ? `Terminals (${element.tab.terminalInstances.length})` : element.tab.terminalInstances[0].title : '';
		} else {
			return element.instance.title;
		}
	}

}
class TerminalTabsAccessibilityProvider implements IListAccessibilityProvider<TabTreeNode> {
	getAriaLabel(element: TabTreeNode) {
		if ('children' in element) {
			return element.tab ? element.tab.terminalInstances.length > 1 ? `Terminals (${element.tab.terminalInstances.length})` : element.tab.terminalInstances[0].title : '';
		} else {
			return element.instance.title;
		}
	}

	getWidgetAriaLabel() {
		return localize('terminal.tabs', "TerminalTabs");
	}
}
export class TerminalTabsWidget extends WorkbenchObjectTree<TabTreeNode>  {
	constructor(
		container: HTMLElement,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService accessibilityService: IAccessibilityService,
		@ITerminalService terminalService: ITerminalService
	) {
		super('TerminalTabsTree', container,
			new TerminalTabsDelegate(),
			[new TerminalTabsRenderer()],
			{
				horizontalScrolling: false,
				supportDynamicHeights: true,
				identityProvider: new TerminalTabsIdentityProvider(),
				accessibilityProvider: new TerminalTabsAccessibilityProvider(),
				styleController: id => new DefaultStyleController(DOM.createStyleSheet(container), id),
				filter: undefined,
				smoothScrolling: configurationService.getValue<boolean>('workbench.list.smoothScrolling'),
				multipleSelectionSupport: false,
			},
			contextKeyService,
			listService,
			themeService,
			configurationService,
			keybindingService,
			accessibilityService,
		);
		this.setChildren(null, undefined);
		this.setChildren(null, createTerminalTabsIterator(terminalService.terminalTabs));
	}
}

function createTerminalTabsIterator(tabs: ITerminalTab[]): Iterable<ITreeElement<TabTreeNode>> {
	const result = tabs.map(tab => {
		const hasChildren = tab.terminalInstances.length > 1;
		const elt = new TabTreeElement(tab);
		return {
			element: elt,
			collapsed: true,
			collapsible: hasChildren,
			children: elt.children.map(child => {
				return {
					element: child,
					collapsed: true,
					collapsible: false
				};
			})
		};
	});
	return result;
}

class TerminalTabsRenderer implements ITreeRenderer<TabTreeNode, never, ITerminalTabEntryTemplate> {

	templateId = 'terminal.tabs';

	renderTemplate(container: HTMLElement): ITerminalTabEntryTemplate {
		return {
			labelElement: DOM.append(container, $('.terminal-tabs-entry')),
		};
	}

	renderElement(node: ITreeNode<TabTreeNode>, index: number, template: ITerminalTabEntryTemplate): void {
		let label = '';
		let item = node.element;
		if ('children' in item) {
			label = item ? item.children.length === 0 ? 'Starting...' : item?.children.length > 1 ? `Terminals (${item.children.length})` : item.children[0].instance.title : '';
		} else if ('instance' in item) {
			label = item.instance.title;
		}
		template.labelElement.textContent = label;
		template.labelElement.title = label;
	}

	disposeTemplate(templateData: ITerminalTabEntryTemplate): void {
	}
}

interface ITerminalTabEntryTemplate {
	labelElement: HTMLElement;
}

type TabTreeNode = TabTreeElement | TabTreeChild;

class TabTreeElement {
	private _tab: ITerminalTab;
	private _children: TabTreeChild[];
	constructor(tab: ITerminalTab) {
		this._tab = tab;
		this._children = this._tab.terminalInstances.map(i => new TabTreeChild(i, this._tab));
	}
	get tab(): ITerminalTab {
		return this._tab;
	}

	get children(): TabTreeChild[] {
		return this._children;
	}

	set children(newChildren: TabTreeChild[]) {
		this._children = newChildren;
	}
}

class TabTreeChild {
	private _instance: ITerminalInstance;
	private _tab: ITerminalTab;
	constructor(instance: ITerminalInstance, tab: ITerminalTab) {
		this._instance = instance;
		this._tab = tab;
	}
	get instance(): ITerminalInstance {
		return this._instance;
	}
	get parent(): ITerminalTab {
		return this._tab;
	}
}