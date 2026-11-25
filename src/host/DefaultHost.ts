import { ExtensionRegistry } from '../application/ExtensionRegistry.js';
import { ShapeFactory } from '../application/ShapeFactory.js';
import { AttributeService } from '../application/AttributeService.js';
import { TreeLabels } from '../application/TreeLabels.js';
import { EditorSession } from '../application/EditorSession.js';
import { SessionFacade } from '../application/SessionFacade.js';
import { FileDocumentStore } from '../infrastructure/FileDocumentStore.js';
import { NodeDirectoryAdapter } from '../infrastructure/NodeDirectoryAdapter.js';
import { SvgCodec } from '../infrastructure/SvgCodec.js';
import { CommandRegistry } from '../cli/CommandRegistry.js';
import { CommandProcessor } from '../cli/CommandProcessor.js';
import { BuiltinPlugin } from '../plugins/builtin/BuiltinPlugin.js';

/** Composition root. The kernel can also be constructed without builtin plugins. */
export class DefaultHost {
  readonly extensions = new ExtensionRegistry();
  readonly factory = new ShapeFactory(() => this.extensions.shapeProviders());
  readonly codec = new SvgCodec(this.factory);
  readonly session = new EditorSession(new FileDocumentStore(this.codec),
    new AttributeService(() => this.extensions.attributeHandlers()), new TreeLabels(() => this.extensions.treeDecorators()));
  readonly api = new SessionFacade(this.session);
  readonly commands = new CommandRegistry(() => this.extensions.commandPlugins());
  readonly cli = new CommandProcessor(this.session, this.commands, this.factory, new NodeDirectoryAdapter(), () => this.factory.help());
  constructor(builtins = true) {
    if (builtins) new BuiltinPlugin().activate(this.extensions);
  }
}
