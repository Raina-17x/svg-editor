import { ShapeFactory } from './application/ShapeFactory.js';
import { EditorSession } from './application/EditorSession.js';
import { FileDocumentStore } from './infrastructure/FileDocumentStore.js';
import { SvgCodec } from './infrastructure/SvgCodec.js';
import { CommandRegistry } from './cli/CommandRegistry.js';
import { CommandProcessor } from './cli/CommandProcessor.js';
import { Repl } from './cli/Repl.js';

const factory = new ShapeFactory();
const session = new EditorSession(new FileDocumentStore(new SvgCodec(factory)));
new Repl(new CommandProcessor(session, new CommandRegistry(factory))).start();
