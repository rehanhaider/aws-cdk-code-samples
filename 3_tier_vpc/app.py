#!/usr/bin/env python3
import os

import aws_cdk as cdk
from stacks import VpcStack

app = cdk.App()

# Environment variables
env = cdk.Environment(
    account=os.environ.get("CDK_DEPLOY_ACCOUNT", os.environ.get("CDK_DEFAULT_ACCOUNT")),
    region=os.environ.get("CDK_DEPLOY_REGION", os.environ.get("CDK_DEFAULT_REGION")),
)

# Define props and get context
props = {
    "name": app.node.try_get_context("vpc_name"),
    "vpc_cidr": app.node.try_get_context("vpc_cidr"),
    "description": app.node.try_get_context("description"),
}

# Create VPC stack
vpc_stack = VpcStack(
    scope=app,
    construct_id="vpc-stack",
    props=props,
    description=props["description"],
    env=env,
)

app.synth()
