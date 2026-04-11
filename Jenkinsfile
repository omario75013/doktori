pipeline {
  agent any

  environment {
    DOCTORI_PROD_HOST = '157.90.152.204'
    DOCTORI_PROD_USER = 'root'
    DOCKER_IMAGE = 'doktori-web:latest'
    COMPOSE_FILE = 'docker-compose.prod.yml'
  }

  options {
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh '''
          corepack enable
          pnpm install --frozen-lockfile
        '''
      }
    }

    stage('Lint') {
      steps {
        sh 'pnpm --filter web lint || true'
      }
    }

    stage('Build') {
      steps {
        sh 'pnpm --filter web build'
      }
    }

    stage('Docker Build') {
      when { branch 'main' }
      steps {
        sh 'docker build -t $DOCKER_IMAGE .'
      }
    }

    stage('Deploy to QA') {
      when { branch 'main' }
      steps {
        input message: 'Deploy to QA?', ok: 'Deploy'
        sh '''
          echo "Deploying to QA environment..."
          # ssh qa-user@qa-host "cd /opt/doktori && docker compose pull && docker compose up -d"
        '''
      }
    }

    stage('Deploy to PROD') {
      when { branch 'main' }
      steps {
        input message: 'Deploy to PRODUCTION?', ok: 'Deploy PROD'
        sh '''
          echo "Deploying to production..."
          ssh $DOCTORI_PROD_USER@$DOCTORI_PROD_HOST "cd /opt/doktori && git pull && docker compose -f $COMPOSE_FILE build && docker compose -f $COMPOSE_FILE up -d"
        '''
      }
    }
  }

  post {
    success {
      sh '''
        curl -X POST https://monitor.dartank.com/api/events/webhook \
          -H "Content-Type: application/json" \
          -d '{"event":"deploy","project":"doktori","branch":"'$BRANCH_NAME'","build":"'$BUILD_NUMBER'","status":"success"}' || true
      '''
    }
    failure {
      sh '''
        curl -X POST https://monitor.dartank.com/api/events/webhook \
          -H "Content-Type: application/json" \
          -d '{"event":"deploy_failure","project":"doktori","branch":"'$BRANCH_NAME'","build":"'$BUILD_NUMBER'","status":"failure"}' || true
      '''
    }
  }
}
