/**
 * Created by michbil on 07.08.16.
 */
import Reflux from 'reflux';
import TextActions from '../actions/texteditor.js';
import {CompositeDecorator, ContentState, SelectionState, Editor, EditorState, Entity, RichUtils, CharacterMetadata, getDefaultKeyBinding,  Modifier} from 'draft-js';
import LinkEntity from '../EditorEntities/LinkEntity.js';
import JSONDocument from '../JSONDocument.js';
import WrioActions from '../actions/wrio.js';

// helper function
function findLinkEntities(contentBlock, callback) {
    contentBlock.findEntityRanges(
        (character) => {
            const entityKey = character.getEntity();
            return (
                !!entityKey &&
                Entity.get(entityKey).getType() === 'LINK'
            );
        },
        callback
    );
}

function appendHttp(url) {
    if (!/^https?:\/\//i.test(url)) {
        return 'http://' + url;
    }
    return url;
}


export default Reflux.createStore({
    listenables:TextActions,

    init() {
        this.state = {
            editorState: EditorState.createEmpty()
        };
        this.oldHeader = "";
    },

    setLinkEditCallback(cb) {
        this.state.linkEditCallback = cb;
    },

    createLinkEntity(title,url,desc) {
        return Entity.create('LINK', 'MUTABLE', {
            linkTitle: title,
            linkUrl: url,
            linkDesc: desc,
            editCallback: this.state.linkEditCallback
        });
    },

    getSelectedText() {
        const { editorState } = this.state;
        var title = '';
        const selectionState = editorState.getSelection();
        const blockKey = selectionState.getAnchorKey();
        const contentBlocks = editorState.getCurrentContent().getBlocksAsArray();
        var start = selectionState.getStartOffset();
        var end = selectionState.getEndOffset();

        contentBlocks.forEach((block) => {
            if(block.key === blockKey){
                title = block.text.slice(start, end);
            }
        });
        return title;
    },

    onUpdateEditorState(state) {
        this.state.editorState = state;
        const header = JSONDocument.getTitle(state.getCurrentContent());
        if (header != this.oldHeader) {
            WrioActions.headerChanged(header);
        }
        this.oldHeader = header;
        //this.trigger(this.state);
        ///console.log("reaction",state);
    },

    onPublishEditorState(state) {
        this.state.editorState = state;
        this.trigger(this.state);
        console.log("reaction",state);
    },

    createEditorState(contentBlocks, mentions) {
        const decorator = new CompositeDecorator([{
            strategy: findLinkEntities,
            component: LinkEntity
        }]);
        let editorState = contentBlocks.length > 0 ?
            EditorState.createWithContent(ContentState.createFromBlockArray(contentBlocks), decorator) :
            EditorState.createEmpty(decorator);

        mentions.forEach((mention, i) => {
            const entityKey = this.createLinkEntity(mention.linkWord,mention.url,mention.linkDesc);
            const block = contentBlocks[mention.block];
            if (!block) {
                console.warn("Cannot create mention",mention);
                return;
            }
            const key = block.getKey();
            try {
                editorState = RichUtils.toggleLink(
                    editorState,
                    SelectionState.createEmpty(key).merge({
                        anchorOffset: mention.start,
                        focusKey: key,
                        focusOffset: mention.end
                    }),
                    entityKey
                );
            } catch (e) {
                console.error("Unable to map mention",e); // lets just skip buggy mention for now
            }

        });
        return editorState;


    },

    onCreateNewLink(titleValue,urlValue,descValue) {

        urlValue = appendHttp(urlValue);

        const entityKey = this.createLinkEntity(titleValue,urlValue,descValue);
        const {editorState} = this.state;

        const e = Entity.get(entityKey).getData();
        console.log(e);

        let _editorState = RichUtils.toggleLink(
            editorState,
            editorState.getSelection(),
            entityKey
        );
        this.onPublishEditorState(_editorState);
    },

    onEditLink(titleValue,urlValue,descValue,linkEntityKey) {
        Entity.mergeData(linkEntityKey, {
            linkTitle: titleValue,
            linkUrl: urlValue,
            linkDesc: descValue
        });
        this.onPublishEditorState(_editorState);
    },

    onRemoveLink(linkEntityKey) {
        const {editorState} = this.state;
        let _editorState;
        editorState.getCurrentContent().getBlockMap().map(block => {
            block.findEntityRanges(char => {
                let entityKey = char.getEntity();
                return !!entityKey && entityKey === linkEntityKey && Entity.get(entityKey).getType() === 'LINK';
            }, (anchorOffset, focusOffset) => {
                _editorState = RichUtils.toggleLink(
                    editorState,
                    SelectionState.createEmpty(block.getKey()).merge({
                        anchorOffset,
                        focusKey: block.getKey(),
                        focusOffset
                    }),
                    null
                );
            });
        });
       this.onPublishEditorState(_editorState);
    }


});