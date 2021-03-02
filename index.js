var cs = require( 'node-schedule' );
var Github = require( 'github-api' );
// TODO: CRON job with webhooks test
// token auth
var gh = new Github( {
  username: '',
  password: ''
} );

function GithubAPI( auth ) {
  let repo;
  let filesToCommit = [];
  let currentBranch = {};
  let newCommit = {};

  let gh = new Github( auth );
  // passes the arguments to the underlying library and saves the repo object.
  this.setRepo = function ( userName, repoName ) {
    repo = gh.getRepo( userName, repoName );
  };

  this.setBranch = function ( branchName ) {
    return repo.listBranches()
      .then( ( branches ) => {
        let branchExists = branches.data
          .find( branch => branch.name === branchName );
        if ( !branchExists ) {
          return repo.createBranch( 'main', branchName )
            .then( () => {
              currentBranch.name = branchName;
            } )
        } else {
          currentBranch.name = branchName;
        }
      } )
  };
  this.pushFiles = function ( message, files ) {
    return getCurrentCommitSHA()
      .then( getCurrentTreeSHA )
      .then( () =>
        createFiles( files )
      )
      .then( createTree )
      .then( () => createCommit( message ) )
      .then( updateHead )
      .catch( ( e ) => {
        console.error( e );
      } )
  };

  function getCurrentCommitSHA() {
    return repo.getRef( 'heads/' + currentBranch.name )
      .then( ( ref ) => {
        currentBranch.commitSHA = ref.data.object.sha;
      } );
  };
  function getCurrentTreeSHA() {
    return repo.getCommit( currentBranch.commitSHA )
      .then( ( commit ) => {
        currentBranch.treeSHA = commit.data.tree.sha;
      } );
  };
  function createFiles( files ) {
    let promises = [];
    let length = files.length;
    for ( let i = 0; i < length; i++ ) {
      promises.push( createFile( files[i] ) );
    }
    return Promise.all( promises );
  };
  function createFile( file ) {
    return repo.createBlob( file.content )
      .then( ( blob ) => {
        filesToCommit.push( {
          sha: blob.data.sha,
          path: file.path,
          mode: '100644',
          type: 'blob'
        } );
      } );
  };
  function createTree() {
    return repo.createTree( filesToCommit, currentBranch.treeSHA )
      .then( ( tree ) => {
        newCommit.treeSHA = tree.data.sha;
      } )
  };
  function createCommit( message ) {
    return repo.commit( currentBranch.commitSHA, newCommit.treeSHA, message )
      .then( ( commit ) => {
        newCommit.sha = commit.data.sha;
      } );
  };
  function updateHead() {
    return repo.updateHead( 'heads/' + currentBranch.name, newCommit.sha );
  };
};

let api = new GithubAPI( { token: '' } );
api.setRepo( '', '' );
api.setBranch( '' )
  .then( () => api.pushFiles( '', [{ content: ``, path: '' }] ) )
  .then( function () { console.log( 'Files committed!' ); } );
